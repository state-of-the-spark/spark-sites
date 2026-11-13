<?php
/**
 * Spark Living: experiment store and evolution log.
 *
 * Storage choice: experiments live in a private custom post type
 * `living_experiment` (post ID = experiment ID, post meta holds the fields).
 * A CPT was chosen over a single options row because there is history (every
 * test ever run, kept for the log), IDs come for free, and WordPress export,
 * revisions of the title and capability handling all work without extra code.
 * The CPT is not public, has no UI and is never exposed to wp/v2.
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Store {

	public const CPT_EXPERIMENT = 'living_experiment';
	public const CPT_EVOLUTION  = 'living_evolution';

	public const STATUS_DRAFT     = 'draft';
	public const STATUS_AWAITING  = 'awaiting_approval';
	public const STATUS_RUNNING   = 'running';
	public const STATUS_CONCLUDED = 'concluded';

	public const DEVICES = array( 'all', 'mobile', 'desktop' );

	/**
	 * Register both private post types.
	 */
	public static function register_post_types(): void {
		$common = array(
			'public'              => false,
			'publicly_queryable'  => false,
			'show_ui'             => false,
			'show_in_menu'        => false,
			'show_in_rest'        => false,
			'exclude_from_search' => true,
			'has_archive'         => false,
			'rewrite'             => false,
			'query_var'           => false,
			'supports'            => array( 'title', 'editor' ),
			'capability_type'     => 'post',
			'map_meta_cap'        => true,
		);

		register_post_type(
			self::CPT_EXPERIMENT,
			array_merge(
				$common,
				array(
					'label'  => __( 'Living experiments', 'spark-living' ),
					'labels' => array( 'singular_name' => __( 'Living experiment', 'spark-living' ) ),
				)
			)
		);
		register_post_type(
			self::CPT_EVOLUTION,
			array_merge(
				$common,
				array(
					'label'  => __( 'Evolution log', 'spark-living' ),
					'labels' => array( 'singular_name' => __( 'Evolution', 'spark-living' ) ),
				)
			)
		);
	}

	/**
	 * Meta fields and their defaults.
	 *
	 * @return array<string, mixed>
	 */
	private static function meta_defaults(): array {
		return array(
			'element_type'  => 'selector',
			'target'        => '',
			'hypothesis'    => '',
			'variants'      => array(),
			'weights'       => array(
				'A' => 0.5,
				'B' => 0.5,
			),
			'status'        => self::STATUS_DRAFT,
			'start_date'    => '',
			'end_date'      => '',
			'tier'          => 1,
			'device'        => 'all',
			'forced_start'  => false,
			'start_sessions_14d' => 0,
			'verdict'       => '',
			'winner'        => '',
			'promoted'      => false,
			'shipped_at'    => '',
			'revert_checked' => false,
			'reverted'      => false,
			'snapshot'      => array(),
		);
	}

	/**
	 * Sanitize the variant definitions for the element type.
	 *
	 * @param string $element_type block|selector.
	 * @param mixed  $variants     Raw variants {A:{label,changes}, B:{...}}.
	 * @return array
	 */
	public static function sanitize_variants( string $element_type, $variants ): array {
		$variants = is_array( $variants ) ? $variants : array();
		$out      = array();
		foreach ( array( 'A', 'B' ) as $key ) {
			$raw          = isset( $variants[ $key ] ) && is_array( $variants[ $key ] ) ? $variants[ $key ] : array();
			$label        = isset( $raw['label'] ) ? sanitize_text_field( (string) $raw['label'] ) : ( 'A' === $key ? 'Current' : 'Challenger' );
			$out[ $key ] = array(
				'label'   => $label,
				'changes' => 'selector' === $element_type ? Spark_Living_Util::sanitize_changes( $raw['changes'] ?? array() ) : array(),
			);
			// Visibility / CSS variant: only the challenger carries a snippet.
			if ( 'B' === $key && 'selector' === $element_type ) {
				$out[ $key ]['css'] = Spark_Living_Util::sanitize_css( $raw['css'] ?? '' );
			}
		}
		return $out;
	}

	/**
	 * Create an experiment.
	 *
	 * @param array $args name, element_type, target, hypothesis, variants, tier.
	 * @return int|WP_Error Experiment ID.
	 */
	public static function create( array $args ) {
		$name = isset( $args['name'] ) ? sanitize_text_field( (string) $args['name'] ) : '';
		if ( '' === $name ) {
			return new WP_Error( 'spark_living_name', __( 'A test needs a name.', 'spark-living' ), array( 'status' => 400 ) );
		}
		$type = ( isset( $args['element_type'] ) && 'block' === $args['element_type'] ) ? 'block' : 'selector';

		$target = '';
		if ( 'selector' === $type ) {
			$target = Spark_Living_Util::sanitize_selector( $args['target'] ?? '' );
			if ( '' === $target ) {
				return new WP_Error( 'spark_living_selector', __( 'A selector test needs a valid CSS selector.', 'spark-living' ), array( 'status' => 400 ) );
			}
		} else {
			$target = isset( $args['target'] ) ? sanitize_text_field( (string) $args['target'] ) : '';
		}

		$variants = self::sanitize_variants( $type, $args['variants'] ?? array() );
		if ( 'selector' === $type && empty( $variants['B']['changes'] ) && empty( $variants['B']['css'] ) ) {
			return new WP_Error( 'spark_living_changes', __( 'Variant B needs at least one valid change or a CSS snippet.', 'spark-living' ), array( 'status' => 400 ) );
		}

		$device = isset( $args['device'] ) ? sanitize_key( (string) $args['device'] ) : 'all';
		if ( '' === $device ) {
			$device = 'all';
		}
		if ( ! in_array( $device, self::DEVICES, true ) ) {
			return new WP_Error( 'spark_living_device', __( 'device must be all, mobile or desktop.', 'spark-living' ), array( 'status' => 400 ) );
		}

		$tier = ( isset( $args['tier'] ) && 2 === (int) $args['tier'] ) ? 2 : 1;

		$id = wp_insert_post(
			array(
				'post_type'   => self::CPT_EXPERIMENT,
				'post_status' => 'publish',
				'post_title'  => $name,
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return $id;
		}

		$values                 = self::meta_defaults();
		$values['element_type'] = $type;
		$values['target']       = $target;
		$values['hypothesis']   = isset( $args['hypothesis'] ) ? sanitize_textarea_field( (string) $args['hypothesis'] ) : '';
		$values['variants']     = $variants;
		$values['tier']         = $tier;
		$values['device']       = $device;
		foreach ( $values as $key => $value ) {
			update_post_meta( $id, '_spark_living_' . $key, wp_slash( $value ) );
		}
		return (int) $id;
	}

	/**
	 * Read one experiment.
	 *
	 * @param int $id Experiment ID.
	 * @return array|null
	 */
	public static function get( int $id ): ?array {
		$post = get_post( $id );
		if ( ! $post || self::CPT_EXPERIMENT !== $post->post_type ) {
			return null;
		}
		$out = array(
			'id'   => (int) $post->ID,
			'name' => $post->post_title,
		);
		foreach ( self::meta_defaults() as $key => $default ) {
			$value = get_post_meta( $post->ID, '_spark_living_' . $key, true );
			if ( '' === $value && is_array( $default ) ) {
				$value = $default;
			}
			if ( '' === $value && ! is_bool( $default ) && ! is_int( $default ) ) {
				$value = $default;
			}
			$out[ $key ] = $value;
		}
		$out['tier']           = (int) $out['tier'];
		$out['device']         = in_array( $out['device'], self::DEVICES, true ) ? $out['device'] : 'all';
		$out['forced_start']   = (bool) $out['forced_start'];
		$out['start_sessions_14d'] = (int) $out['start_sessions_14d'];
		$out['promoted']       = (bool) $out['promoted'];
		$out['revert_checked'] = (bool) $out['revert_checked'];
		$out['reverted']       = (bool) $out['reverted'];
		return $out;
	}

	/**
	 * Update one or more meta fields.
	 *
	 * @param int   $id     Experiment ID.
	 * @param array $fields Key => value (keys from meta_defaults()).
	 */
	public static function update( int $id, array $fields ): void {
		$allowed = self::meta_defaults();
		foreach ( $fields as $key => $value ) {
			if ( array_key_exists( $key, $allowed ) ) {
				update_post_meta( $id, '_spark_living_' . $key, wp_slash( $value ) );
			}
		}
	}

	/**
	 * Experiments, newest first.
	 *
	 * @param array $meta_query Optional extra meta query clauses.
	 * @return array[]
	 */
	public static function all( array $meta_query = array() ): array {
		$ids = get_posts(
			array(
				'post_type'        => self::CPT_EXPERIMENT,
				'post_status'      => 'publish',
				'numberposts'      => 200,
				'orderby'          => 'ID',
				'order'            => 'DESC',
				'fields'           => 'ids',
				'meta_query'       => $meta_query, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				'suppress_filters' => false,
			)
		);
		$out = array();
		foreach ( $ids as $id ) {
			$exp = self::get( (int) $id );
			if ( $exp ) {
				$out[] = $exp;
			}
		}
		return $out;
	}

	/**
	 * The single running test, if any.
	 *
	 * @return array|null
	 */
	public static function get_running(): ?array {
		$rows = self::all(
			array(
				array(
					'key'   => '_spark_living_status',
					'value' => self::STATUS_RUNNING,
				),
			)
		);
		return $rows ? $rows[0] : null;
	}

	/**
	 * Shipped winners that are live for non-holdout visitors.
	 *
	 * @return array[]
	 */
	public static function get_promoted(): array {
		return self::all(
			array(
				array(
					'key'   => '_spark_living_promoted',
					'value' => '1',
				),
			)
		);
	}

	/**
	 * Start a draft or approved test. Enforces one running test per site.
	 *
	 * Eligibility (100+ sessions in 14 days) is checked by the callers through
	 * check_eligibility(); this method records the outcome on the experiment.
	 *
	 * @param int   $id   Experiment ID.
	 * @param array $opts Optional: forced_start (bool), start_sessions_14d (int).
	 * @return true|WP_Error
	 */
	public static function start( int $id, array $opts = array() ) {
		$exp = self::get( $id );
		if ( ! $exp ) {
			return new WP_Error( 'spark_living_missing', __( 'Test not found.', 'spark-living' ), array( 'status' => 404 ) );
		}
		if ( ! in_array( $exp['status'], array( self::STATUS_DRAFT, self::STATUS_AWAITING ), true ) ) {
			return new WP_Error( 'spark_living_state', __( 'Only a draft test can be started.', 'spark-living' ), array( 'status' => 409 ) );
		}
		if ( self::get_running() ) {
			return new WP_Error( 'spark_living_busy', __( 'A test is already running. One test per site at a time.', 'spark-living' ), array( 'status' => 409 ) );
		}
		self::update(
			$id,
			array(
				'status'     => self::STATUS_RUNNING,
				'start_date' => Spark_Living_Util::mysql_utc(),
				'weights'    => array(
					'A' => 0.5,
					'B' => 0.5,
				),
				'forced_start'       => ! empty( $opts['forced_start'] ),
				'start_sessions_14d' => isset( $opts['start_sessions_14d'] ) ? max( 0, (int) $opts['start_sessions_14d'] ) : 0,
			)
		);
		do_action( 'spark_living_test_started', $id );
		return true;
	}

	/**
	 * Eligibility at start: the target page (for a device-scoped test, the
	 * target page on that device) needs 100 or more sessions in the last 14
	 * days. The plugin has no pageview data, so the caller (the brain, from
	 * GA4) states the number as `sessions_14d`. An administrator may start a
	 * test below the bar with force; that is recorded on the experiment.
	 *
	 * @param mixed  $sessions Raw sessions_14d (null or '' when not sent).
	 * @param bool   $force    Raw force flag.
	 * @param string $device   all, mobile or desktop (used in the message).
	 * @return array{sessions: int, forced: bool}|WP_Error
	 */
	public static function check_eligibility( $sessions, bool $force, string $device = 'all' ) {
		$min     = Spark_Living_Stats::ELIGIBILITY_SESSIONS;
		$has     = ( null !== $sessions && '' !== $sessions );
		$where   = ( 'all' === $device ) ? __( 'on the target page', 'spark-living' ) : sprintf( /* translators: %s: mobile or desktop */ __( 'on the target page on %s', 'spark-living' ), $device );
		$can_all = current_user_can( 'manage_options' );

		if ( $has && ( ! is_numeric( $sessions ) || (float) $sessions < 0 || (float) $sessions !== floor( (float) $sessions ) ) ) {
			return new WP_Error( 'spark_living_sessions_invalid', __( 'sessions_14d must be a whole number of zero or more.', 'spark-living' ), array( 'status' => 400 ) );
		}
		$n = $has ? (int) $sessions : 0;

		if ( $has && $n >= $min ) {
			return array(
				'sessions' => $n,
				'forced'   => false,
			);
		}
		if ( $force ) {
			if ( ! $can_all ) {
				return new WP_Error( 'spark_living_force_denied', __( 'Only an administrator can force a start below the session bar.', 'spark-living' ), array( 'status' => 403 ) );
			}
			return array(
				'sessions' => $n,
				'forced'   => true,
			);
		}
		if ( ! $has ) {
			return new WP_Error(
				'spark_living_eligibility_missing',
				sprintf(
					/* translators: 1: where, 2: minimum sessions */
					__( 'Not started: send sessions_14d, the sessions %1$s in the last 14 days. A test needs at least %2$d. An administrator can send force:true to start anyway.', 'spark-living' ),
					$where,
					$min
				),
				array(
					'status'   => 400,
					'required' => $min,
					'device'   => $device,
				)
			);
		}
		return new WP_Error(
			'spark_living_not_eligible',
			sprintf(
				/* translators: 1: sessions, 2: where, 3: minimum sessions */
				__( 'Not started: only %1$d sessions %2$s in the last 14 days; a test needs at least %3$d. An administrator can send force:true to start anyway; the start is then recorded as below the bar.', 'spark-living' ),
				$n,
				$where,
				$min
			),
			array(
				'status'       => 422,
				'sessions_14d' => $n,
				'required'     => $min,
				'device'       => $device,
			)
		);
	}

	/**
	 * Concluded tests by outcome, from the evolution log (not capped at one page).
	 *
	 * evolved:       a challenger won and shipped (verdict ship_b).
	 * keep_a:        the original won.
	 * no_difference: concluded with no difference.
	 * guard_blocked: challenger blocked by the lead guard.
	 * reverted:      shipped winners later rolled back (log entries of type revert).
	 *
	 * @return array<string, int>
	 */
	public static function verdict_tally(): array {
		$count = static function ( string $entry_type, string $verdict ): int {
			$q = new WP_Query(
				array(
					'post_type'      => self::CPT_EVOLUTION,
					'post_status'    => 'publish',
					'posts_per_page' => 1,
					'fields'         => 'ids',
					'no_found_rows'  => false,
					'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
						'relation' => 'AND',
						array(
							'key'   => '_spark_living_log_entry_type',
							'value' => $entry_type,
						),
						array(
							'key'   => '_spark_living_log_verdict',
							'value' => $verdict,
						),
					),
				)
			);
			return (int) $q->found_posts;
		};
		return array(
			'evolved'       => $count( 'test', Spark_Living_Stats::V_SHIP_B ),
			'keep_a'        => $count( 'test', Spark_Living_Stats::V_KEEP_A ),
			'no_difference' => $count( 'test', Spark_Living_Stats::V_NO_DIFF ),
			'guard_blocked' => $count( 'test', Spark_Living_Stats::V_GUARD_BLOCKED ),
			'reverted'      => $count( 'revert', 'reverted' ),
		);
	}

	/**
	 * How should a Living Block for this experiment render?
	 *
	 * 'both'     the experiment is running or a winner is promoted: output both
	 *            variants and let the browser script choose.
	 * 'baseline' anything else: output variant A only.
	 *
	 * @param int $id Experiment ID.
	 * @return string
	 */
	public static function render_state( int $id ): string {
		$exp = $id > 0 ? self::get( $id ) : null;
		if ( ! $exp ) {
			return 'baseline';
		}
		if ( self::STATUS_RUNNING === $exp['status'] || $exp['promoted'] ) {
			return 'both';
		}
		return 'baseline';
	}

	/**
	 * Evolution log entries, newest first.
	 *
	 * @param int $per_page Page size.
	 * @param int $page     Page number.
	 * @return array{items: array[], total: int}
	 */
	public static function log_entries( int $per_page = 50, int $page = 1 ): array {
		$q = new WP_Query(
			array(
				'post_type'      => self::CPT_EVOLUTION,
				'post_status'    => 'publish',
				'posts_per_page' => max( 1, min( 100, $per_page ) ),
				'paged'          => max( 1, $page ),
				'orderby'        => 'date',
				'order'          => 'DESC',
				'no_found_rows'  => false,
			)
		);
		$items = array();
		foreach ( $q->posts as $post ) {
			$items[] = self::format_log_entry( $post );
		}
		return array(
			'items' => $items,
			'total' => (int) $q->found_posts,
		);
	}

	/**
	 * Shape one log post for output.
	 *
	 * @param WP_Post $post Log post.
	 * @return array
	 */
	public static function format_log_entry( WP_Post $post ): array {
		$meta = static function ( string $key ) use ( $post ) {
			return get_post_meta( $post->ID, '_spark_living_log_' . $key, true );
		};
		return array(
			'id'            => (int) $post->ID,
			'title'         => $post->post_title,
			'entry_type'    => (string) $meta( 'entry_type' ),
			'experiment_id' => (int) $meta( 'experiment_id' ),
			'element_type'  => (string) $meta( 'element_type' ),
			'target'        => (string) $meta( 'target' ),
			'hypothesis'    => (string) $meta( 'hypothesis' ),
			'variant_a'     => $meta( 'variant_a' ),
			'variant_b'     => $meta( 'variant_b' ),
			'numbers'       => $meta( 'numbers' ),
			'verdict'       => (string) $meta( 'verdict' ),
			'shipped'       => (bool) $meta( 'shipped' ),
			'started'       => (string) $meta( 'started' ),
			'ended'         => (string) $meta( 'ended' ),
			'note'          => (string) $meta( 'note' ),
			'device'        => '' !== (string) $meta( 'device' ) ? (string) $meta( 'device' ) : 'all',
			'forced_start'  => (bool) $meta( 'forced_start' ),
			'start_sessions_14d' => (int) $meta( 'start_sessions_14d' ),
			'logged_at'     => $post->post_date_gmt,
		);
	}

	/**
	 * Write an evolution log entry.
	 *
	 * @param array $exp   Experiment array (from get()).
	 * @param array $data  verdict, numbers, shipped, entry_type, note.
	 * @return int|WP_Error
	 */
	public static function add_log_entry( array $exp, array $data ) {
		$verdict    = (string) ( $data['verdict'] ?? '' );
		$entry_type = (string) ( $data['entry_type'] ?? 'test' );
		$id         = wp_insert_post(
			array(
				'post_type'    => self::CPT_EVOLUTION,
				'post_status'  => 'publish',
				'post_title'   => sprintf( '%s (%s)', $exp['name'], $verdict ),
				'post_content' => $exp['hypothesis'],
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		$fields = array(
			'entry_type'    => $entry_type,
			'experiment_id' => (int) $exp['id'],
			'element_type'  => $exp['element_type'],
			'target'        => $exp['target'],
			'hypothesis'    => $exp['hypothesis'],
			'variant_a'     => $exp['variants']['A'] ?? array(),
			'variant_b'     => $exp['variants']['B'] ?? array(),
			'numbers'       => $data['numbers'] ?? array(),
			'verdict'       => $verdict,
			'shipped'       => ! empty( $data['shipped'] ),
			'started'       => $exp['start_date'],
			'device'        => $exp['device'],
			'forced_start'  => $exp['forced_start'],
			'start_sessions_14d' => $exp['start_sessions_14d'],
			'ended'         => Spark_Living_Util::mysql_utc(),
			'note'          => isset( $data['note'] ) ? sanitize_textarea_field( (string) $data['note'] ) : '',
		);
		foreach ( $fields as $key => $value ) {
			update_post_meta( $id, '_spark_living_log_' . $key, wp_slash( $value ) );
		}
		return (int) $id;
	}
}
