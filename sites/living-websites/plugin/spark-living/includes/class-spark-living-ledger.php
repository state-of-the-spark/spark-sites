<?php
/**
 * Spark Living: the Change Ledger (0.3.0).
 *
 * One row per change of any kind, in the table `{prefix}spark_living_changes`.
 * Every code path that changes a test, the weights, the charter or the plugin
 * itself calls record(). Outside agents add their own rows through
 * POST /changes. Undo is implemented for three kinds only: unqueue a queued
 * test, restore the previous charter, restore the previous weights.
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Ledger {

	public const KINDS = array(
		'test_suggested',
		'test_queued',
		'test_unqueued',
		'test_dismissed',
		'test_started',
		'test_concluded',
		'winner_applied',
		'reverted',
		'weights_changed',
		'style_fix',
		'ad_change',
		'charter_update',
		'rows_removed',
		'plugin_update',
		'other',
	);

	public const VERDICTS = array( 'pass', 'fail', 'hold', 'na' );
	public const STATUSES = array( 'applied', 'undone', 'failed' );

	/**
	 * Table name.
	 *
	 * @return string
	 */
	public static function table(): string {
		global $wpdb;
		return $wpdb->prefix . 'spark_living_changes';
	}

	/**
	 * Create or upgrade the table with dbDelta. Safe to run any number of times.
	 */
	public static function create_table(): void {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$table   = self::table();
		$charset = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  created_at datetime NOT NULL,
  kind varchar(32) NOT NULL DEFAULT 'other',
  subject_type varchar(32) NOT NULL DEFAULT '',
  subject_id varchar(64) NOT NULL DEFAULT '',
  summary varchar(300) NOT NULL DEFAULT '',
  before_json longtext NULL,
  after_json longtext NULL,
  proposed_by varchar(80) NOT NULL DEFAULT '',
  gate_verdict varchar(8) NOT NULL DEFAULT 'na',
  gate_reasons text NULL,
  gate_by varchar(80) NOT NULL DEFAULT '',
  charter_version int(10) unsigned NOT NULL DEFAULT 0,
  evidence_json longtext NULL,
  result_json longtext NULL,
  undo_json longtext NULL,
  undone_at datetime NULL,
  status varchar(10) NOT NULL DEFAULT 'applied',
  PRIMARY KEY  (id),
  KEY kind_idx (kind),
  KEY subject_idx (subject_type,subject_id),
  KEY created_idx (created_at)
) {$charset};";

		dbDelta( $sql );
	}

	/**
	 * Does the table exist?
	 *
	 * @return bool
	 */
	public static function table_exists(): bool {
		global $wpdb;
		$t = self::table();
		return (bool) $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $t ) ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	}

	/**
	 * Text capped at $max characters.
	 *
	 * @param mixed $v   Raw value.
	 * @param int   $max Characters.
	 * @return string
	 */
	private static function cap( $v, int $max ): string {
		$v = sanitize_text_field( is_scalar( $v ) ? (string) $v : '' );
		return function_exists( 'mb_substr' ) ? mb_substr( $v, 0, $max ) : substr( $v, 0, $max );
	}

	/**
	 * JSON for a column, or null when empty. Capped so a runaway payload cannot
	 * fill the table.
	 *
	 * @param mixed $v Array, object or JSON string.
	 * @return string|null
	 */
	private static function to_json( $v ): ?string {
		if ( is_string( $v ) ) {
			$d = json_decode( $v, true );
			$v = ( null !== $d || 'null' === trim( $v ) ) ? $d : array( 'text' => $v );
		}
		if ( null === $v || array() === $v || '' === $v ) {
			return null;
		}
		$json = wp_json_encode( $v );
		if ( ! is_string( $json ) ) {
			return null;
		}
		if ( strlen( $json ) > 60000 ) {
			$json = wp_json_encode( array( 'truncated' => true, 'bytes' => strlen( $json ) ) );
		}
		return $json;
	}

	/**
	 * Write one ledger row. Every automatic and manual change goes through here.
	 *
	 * @param array $row kind, subject_type, subject_id, summary (300), before,
	 *                   after, proposed_by, gate_verdict, gate_reasons, gate_by,
	 *                   charter_version (default: the current one), evidence,
	 *                   result, undo, status (default applied), created_at
	 *                   (UTC datetime; default now). The *_json spellings are
	 *                   accepted for the JSON fields.
	 * @return int The new row id (0 when it could not be written).
	 */
	public static function record( array $row ): int {
		global $wpdb;
		$json = static function ( string $name ) use ( $row ) {
			if ( array_key_exists( $name . '_json', $row ) ) {
				return $row[ $name . '_json' ];
			}
			return $row[ $name ] ?? null;
		};

		$kind = isset( $row['kind'] ) ? sanitize_key( (string) $row['kind'] ) : 'other';
		$kind = in_array( $kind, self::KINDS, true ) ? $kind : 'other';

		$verdict = isset( $row['gate_verdict'] ) ? sanitize_key( (string) $row['gate_verdict'] ) : 'na';
		$verdict = in_array( $verdict, self::VERDICTS, true ) ? $verdict : 'na';

		$status = isset( $row['status'] ) ? sanitize_key( (string) $row['status'] ) : 'applied';
		$status = in_array( $status, self::STATUSES, true ) ? $status : 'applied';

		$created = ( isset( $row['created_at'] ) && preg_match( '/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/', (string) $row['created_at'] ) ) ? (string) $row['created_at'] : Spark_Living_Util::mysql_utc();

		$reasons = isset( $row['gate_reasons'] ) ? sanitize_textarea_field( (string) $row['gate_reasons'] ) : '';
		$reasons = function_exists( 'mb_substr' ) ? mb_substr( $reasons, 0, 600 ) : substr( $reasons, 0, 600 );

		$data = array(
			'created_at'      => $created,
			'kind'            => $kind,
			'subject_type'    => self::cap( $row['subject_type'] ?? '', 32 ),
			'subject_id'      => self::cap( $row['subject_id'] ?? '', 64 ),
			'summary'         => self::cap( $row['summary'] ?? '', 300 ),
			'before_json'     => self::to_json( $json( 'before' ) ),
			'after_json'      => self::to_json( $json( 'after' ) ),
			'proposed_by'     => self::cap( $row['proposed_by'] ?? '', 80 ),
			'gate_verdict'    => $verdict,
			'gate_reasons'    => $reasons,
			'gate_by'         => self::cap( $row['gate_by'] ?? '', 80 ),
			'charter_version' => isset( $row['charter_version'] ) ? max( 0, (int) $row['charter_version'] ) : Spark_Living_Charter::version(),
			'evidence_json'   => self::to_json( $json( 'evidence' ) ),
			'result_json'     => self::to_json( $json( 'result' ) ),
			'undo_json'       => self::to_json( $json( 'undo' ) ),
			'status'          => $status,
		);
		$ok = $wpdb->insert( self::table(), $data ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		return $ok ? (int) $wpdb->insert_id : 0;
	}

	/**
	 * Decode a JSON column.
	 *
	 * @param mixed $v Column value.
	 * @return mixed Array or null.
	 */
	private static function from_json( $v ) {
		if ( null === $v || '' === $v ) {
			return null;
		}
		$d = json_decode( (string) $v, true );
		return ( JSON_ERROR_NONE === json_last_error() ) ? $d : null;
	}

	/**
	 * Shape one table row for output. The JSON fields keep their column names
	 * and hold decoded values.
	 *
	 * @param array $r Row from $wpdb (ARRAY_A).
	 * @return array
	 */
	public static function present( array $r ): array {
		$undo = self::from_json( $r['undo_json'] ?? null );
		return array(
			'id'              => (int) $r['id'],
			'created_at'      => (string) $r['created_at'],
			'kind'            => (string) $r['kind'],
			'subject_type'    => (string) $r['subject_type'],
			'subject_id'      => (string) $r['subject_id'],
			'summary'         => (string) $r['summary'],
			'before_json'     => self::from_json( $r['before_json'] ?? null ),
			'after_json'      => self::from_json( $r['after_json'] ?? null ),
			'proposed_by'     => (string) $r['proposed_by'],
			'gate_verdict'    => (string) $r['gate_verdict'],
			'gate_reasons'    => (string) ( $r['gate_reasons'] ?? '' ),
			'gate_by'         => (string) $r['gate_by'],
			'charter_version' => (int) $r['charter_version'],
			'evidence_json'   => self::from_json( $r['evidence_json'] ?? null ),
			'result_json'     => self::from_json( $r['result_json'] ?? null ),
			'undo_json'       => $undo,
			'undone_at'       => (string) ( $r['undone_at'] ?? '' ),
			'status'          => (string) $r['status'],
			'can_undo'        => self::can_undo( $r, is_array( $undo ) ? $undo : array() ),
		);
	}

	/**
	 * Can this row be undone right now?
	 *
	 * @param array $r    Raw row.
	 * @param array $undo Decoded undo payload.
	 * @return bool
	 */
	private static function can_undo( array $r, array $undo ): bool {
		if ( 'applied' !== ( $r['status'] ?? '' ) || ! empty( $r['undone_at'] ) || empty( $undo['action'] ) ) {
			return false;
		}
		switch ( $undo['action'] ) {
			case 'unqueue':
				$exp = Spark_Living_Store::get( (int) ( $undo['experiment_id'] ?? 0 ) );
				return $exp && Spark_Living_Store::STATUS_QUEUED === $exp['status'];
			case 'restore_charter':
				return isset( $undo['expect_version'] ) && (int) $undo['expect_version'] === Spark_Living_Charter::version();
			case 'restore_weights':
				$exp = Spark_Living_Store::get( (int) ( $undo['experiment_id'] ?? 0 ) );
				return $exp && Spark_Living_Store::STATUS_RUNNING === $exp['status'];
		}
		return false;
	}

	/**
	 * One row by id.
	 *
	 * @param int $id Row id.
	 * @return array|null Raw row.
	 */
	public static function get_raw( int $id ): ?array {
		global $wpdb;
		$row = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . self::table() . ' WHERE id = %d', $id ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared
		return is_array( $row ) ? $row : null;
	}

	/**
	 * One row, presented.
	 *
	 * @param int $id Row id.
	 * @return array|null
	 */
	public static function get( int $id ): ?array {
		$r = self::get_raw( $id );
		return $r ? self::present( $r ) : null;
	}

	/**
	 * Rows, newest first.
	 *
	 * @param array $args per_page (1 to 100), page, kind, subject_id, subject_type.
	 * @return array{items: array[], total: int}
	 */
	public static function query( array $args = array() ): array {
		global $wpdb;
		$per_page = max( 1, min( 100, (int) ( $args['per_page'] ?? 20 ) ) );
		$page     = max( 1, (int) ( $args['page'] ?? 1 ) );
		$where    = array( '1=1' );
		$params   = array();
		if ( ! empty( $args['kind'] ) ) {
			$where[]  = 'kind = %s';
			$params[] = sanitize_key( (string) $args['kind'] );
		}
		if ( isset( $args['subject_id'] ) && '' !== (string) $args['subject_id'] ) {
			$where[]  = 'subject_id = %s';
			$params[] = self::cap( $args['subject_id'], 64 );
		}
		if ( ! empty( $args['subject_type'] ) ) {
			$where[]  = 'subject_type = %s';
			$params[] = self::cap( $args['subject_type'], 32 );
		}
		$clause = implode( ' AND ', $where );
		$table  = self::table();

		$count_sql = "SELECT COUNT(*) FROM {$table} WHERE {$clause}";
		$total     = (int) ( $params ? $wpdb->get_var( $wpdb->prepare( $count_sql, $params ) ) : $wpdb->get_var( $count_sql ) ); // phpcs:ignore WordPress.DB

		$sql      = "SELECT * FROM {$table} WHERE {$clause} ORDER BY created_at DESC, id DESC LIMIT %d OFFSET %d";
		$params[] = $per_page;
		$params[] = ( $page - 1 ) * $per_page;
		$rows     = $wpdb->get_results( $wpdb->prepare( $sql, $params ), ARRAY_A ); // phpcs:ignore WordPress.DB

		$items = array();
		foreach ( (array) $rows as $r ) {
			$items[] = self::present( $r );
		}
		return array(
			'items' => $items,
			'total' => $total,
		);
	}

	/**
	 * The newest rows (for GET /state and the dashboard).
	 *
	 * @param int $n How many.
	 * @return array[]
	 */
	public static function latest( int $n = 10 ): array {
		$q = self::query( array( 'per_page' => $n ) );
		return $q['items'];
	}

	/**
	 * The last speed measurement posted through POST /changes (kind other,
	 * subject_type speed). Record only: nothing enforces it.
	 *
	 * @return array|null
	 */
	public static function last_speed(): ?array {
		$q = self::query(
			array(
				'per_page'     => 1,
				'kind'         => 'other',
				'subject_type' => 'speed',
			)
		);
		if ( empty( $q['items'][0] ) ) {
			return null;
		}
		$row  = $q['items'][0];
		$vals = is_array( $row['after_json'] ) ? $row['after_json'] : ( is_array( $row['result_json'] ) ? $row['result_json'] : array() );
		$out  = array(
			'load_ms'           => isset( $vals['load_ms'] ) && is_numeric( $vals['load_ms'] ) ? (float) $vals['load_ms'] : null,
			'button_visible_ms' => isset( $vals['button_visible_ms'] ) && is_numeric( $vals['button_visible_ms'] ) ? (float) $vals['button_visible_ms'] : null,
			'added_kb'          => null,
			'measured_at'       => (string) $row['created_at'],
			'measured_by'       => (string) $row['proposed_by'],
			'change_id'         => (int) $row['id'],
		);
		foreach ( array( 'added_kb', 'max_added_kb' ) as $k ) {
			if ( isset( $vals[ $k ] ) && is_numeric( $vals[ $k ] ) ) {
				$out['added_kb'] = (float) $vals[ $k ];
				break;
			}
		}
		return $out;
	}

	/**
	 * Undo a row, for the kinds where undo is implemented. The undo is recorded
	 * as a new row and the original is marked undone.
	 *
	 * @param int    $id Row id.
	 * @param string $by Who is undoing it.
	 * @return array|WP_Error The new ledger row, presented.
	 */
	public static function undo( int $id, string $by = 'owner' ) {
		global $wpdb;
		$raw = self::get_raw( $id );
		if ( ! $raw ) {
			return new WP_Error( 'spark_living_change_missing', __( 'No such change.', 'spark-living' ), array( 'status' => 404 ) );
		}
		$undo = self::from_json( $raw['undo_json'] ?? null );
		$undo = is_array( $undo ) ? $undo : array();
		if ( empty( $undo['action'] ) || ! in_array( $undo['action'], array( 'unqueue', 'restore_charter', 'restore_weights' ), true ) ) {
			return new WP_Error( 'spark_living_not_undoable', __( 'Not undoable: this kind of change has no automatic undo. Reverse it by hand and record that as a new change.', 'spark-living' ), array( 'status' => 409 ) );
		}
		if ( 'applied' !== $raw['status'] || ! empty( $raw['undone_at'] ) ) {
			return new WP_Error( 'spark_living_not_undoable', __( 'Not undoable: this change has already been undone.', 'spark-living' ), array( 'status' => 409 ) );
		}
		$by = '' !== $by ? self::cap( $by, 80 ) : 'owner';

		$new_id = 0;
		if ( 'unqueue' === $undo['action'] ) {
			$exp_id = (int) ( $undo['experiment_id'] ?? 0 );
			$done   = Spark_Living_Queue::unqueue( $exp_id, $by, array( 'undo_of' => $id ) );
			if ( is_wp_error( $done ) ) {
				return new WP_Error( 'spark_living_not_undoable', __( 'Not undoable now: that test is no longer waiting in the queue.', 'spark-living' ), array( 'status' => 409 ) );
			}
			$new_id = (int) Spark_Living_Queue::$last_change_id;
		} elseif ( 'restore_charter' === $undo['action'] ) {
			if ( (int) ( $undo['expect_version'] ?? -1 ) !== Spark_Living_Charter::version() ) {
				return new WP_Error( 'spark_living_not_undoable', __( 'Not undoable now: the charter has been saved again since this change.', 'spark-living' ), array( 'status' => 409 ) );
			}
			$charter = is_array( $undo['charter'] ?? null ) ? $undo['charter'] : array();
			$saved   = Spark_Living_Charter::restore( $charter, $by, $id );
			if ( is_wp_error( $saved ) ) {
				return $saved;
			}
			$new_id = (int) ( $saved['change_id'] ?? 0 );
		} else {
			$exp_id = (int) ( $undo['experiment_id'] ?? 0 );
			$exp    = Spark_Living_Store::get( $exp_id );
			if ( ! $exp || Spark_Living_Store::STATUS_RUNNING !== $exp['status'] ) {
				return new WP_Error( 'spark_living_not_undoable', __( 'Not undoable now: that test is not running.', 'spark-living' ), array( 'status' => 409 ) );
			}
			$weights = is_array( $undo['weights'] ?? null ) ? $undo['weights'] : array();
			$a       = isset( $weights['A'] ) ? (float) $weights['A'] : 0.5;
			$b       = isset( $weights['B'] ) ? (float) $weights['B'] : 0.5;
			Spark_Living_Store::update( $exp_id, array( 'weights' => array( 'A' => $a, 'B' => $b ) ) );
			Spark_Living_Util::flush_page_cache();
			$new_id = self::record(
				array(
					'kind'         => 'weights_changed',
					'subject_type' => 'test',
					'subject_id'   => (string) $exp_id,
					'summary'      => sprintf( /* translators: 1: test name, 2: weights, 3: change id */ __( 'Weights on "%1$s" put back to %2$s (undo of change #%3$d).', 'spark-living' ), $exp['name'], self::weights_text( array( 'A' => $a, 'B' => $b ) ), $id ),
					'before'       => $exp['weights'],
					'after'        => array( 'A' => $a, 'B' => $b ),
					'proposed_by'  => $by,
					'evidence'     => array( 'undo_of' => $id ),
				)
			);
		}

		$wpdb->update( self::table(), array( 'status' => 'undone', 'undone_at' => Spark_Living_Util::mysql_utc() ), array( 'id' => $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		return (array) self::get( $new_id );
	}

	/**
	 * "50/50" style text for a weights pair.
	 *
	 * @param array $w A and B weights.
	 * @return string
	 */
	public static function weights_text( array $w ): string {
		$a = (float) ( $w['A'] ?? 0.5 );
		$b = (float) ( $w['B'] ?? 0.5 );
		return round( $a * 100 ) . '/' . round( $b * 100 );
	}

	/**
	 * Display words for a kind.
	 *
	 * @param string $kind Kind key.
	 * @return string
	 */
	public static function kind_label( string $kind ): string {
		$labels = array(
			'test_suggested'  => __( 'Test suggested', 'spark-living' ),
			'test_queued'     => __( 'Test queued', 'spark-living' ),
			'test_unqueued'   => __( 'Test taken off the queue', 'spark-living' ),
			'test_dismissed'  => __( 'Test dismissed', 'spark-living' ),
			'test_started'    => __( 'Test started', 'spark-living' ),
			'test_concluded'  => __( 'Test ended', 'spark-living' ),
			'winner_applied'  => __( 'Winner made permanent', 'spark-living' ),
			'reverted'        => __( 'Winner reverted', 'spark-living' ),
			'weights_changed' => __( 'Traffic split changed', 'spark-living' ),
			'style_fix'       => __( 'Style fix', 'spark-living' ),
			'ad_change'       => __( 'Ad change', 'spark-living' ),
			'charter_update'  => __( 'Site goals saved', 'spark-living' ),
			'rows_removed'    => __( 'Rows removed', 'spark-living' ),
			'plugin_update'   => __( 'Plugin update', 'spark-living' ),
			'other'           => __( 'Other change', 'spark-living' ),
		);
		return $labels[ $kind ] ?? $kind;
	}
}
