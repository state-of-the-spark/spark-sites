<?php
/**
 * Spark Living: the Site Charter (0.3.0).
 *
 * One record per site, stored as a JSON string in the option
 * `spark_living_charter`: what the site is for, what counts as a conversion,
 * who it is for, the brand rules, what no automated change may touch, and how
 * much the system may do on its own. Every save raises `version` by one, so a
 * Goal Gate verdict can be tied to the exact charter it was judged against.
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Charter {

	public const OPTION = 'spark_living_charter';

	public const CONVERSION_TYPES = array( 'form', 'call', 'booking', 'purchase' );
	public const AUTONOMY_LEVELS  = array( 'suggest', 'tier1', 'full' );

	/** Keyed sub-objects: a partial save changes only the fields it names. */
	private const SUBOBJECTS = array( 'primary_conversion', 'brand', 'speed_budget' );

	/**
	 * An empty charter (what a site has before anyone writes one).
	 *
	 * @return array
	 */
	public static function defaults(): array {
		return array(
			'version'               => 0,
			'business_name'         => '',
			'business_goal'         => '',
			'primary_conversion'    => self::empty_conversion(),
			'secondary_conversions' => array(),
			'audience'              => '',
			'brand'                 => array(
				'colors'       => array(),
				'fonts'        => array(),
				'button_shape' => '',
				'voice_notes'  => '',
			),
			'off_limits'            => array(),
			'autonomy_level'        => 'suggest',
			'speed_budget'          => array(
				'load_ms'            => null,
				'button_visible_ms'  => null,
				'max_added_kb'       => null,
			),
			'updated_at'            => '',
			'updated_by'            => '',
		);
	}

	/**
	 * An unset conversion.
	 *
	 * @return array
	 */
	private static function empty_conversion(): array {
		return array(
			'type'        => '',
			'description' => '',
			'selector'    => '',
		);
	}

	/**
	 * The stored charter merged over the defaults.
	 *
	 * @return array
	 */
	public static function get(): array {
		$raw    = get_option( self::OPTION, '' );
		$stored = is_string( $raw ) && '' !== $raw ? json_decode( $raw, true ) : ( is_array( $raw ) ? $raw : array() );
		$stored = is_array( $stored ) ? $stored : array();
		$out    = self::defaults();
		foreach ( $out as $key => $default ) {
			if ( ! array_key_exists( $key, $stored ) ) {
				continue;
			}
			if ( in_array( $key, self::SUBOBJECTS, true ) && is_array( $stored[ $key ] ) ) {
				$out[ $key ] = array_merge( $default, $stored[ $key ] );
			} else {
				$out[ $key ] = $stored[ $key ];
			}
		}
		$out['version']        = (int) $out['version'];
		$out['autonomy_level'] = in_array( $out['autonomy_level'], self::AUTONOMY_LEVELS, true ) ? $out['autonomy_level'] : 'suggest';
		return $out;
	}

	/**
	 * Current charter version (0 until the first save).
	 *
	 * @return int
	 */
	public static function version(): int {
		$c = self::get();
		return (int) $c['version'];
	}

	/**
	 * Current autonomy level.
	 *
	 * @return string suggest, tier1 or full.
	 */
	public static function autonomy(): string {
		$c = self::get();
		return (string) $c['autonomy_level'];
	}

	/**
	 * Text capped at $max characters.
	 *
	 * @param mixed $value Raw text.
	 * @param int   $max   Characters.
	 * @param bool  $multi Keep line breaks.
	 * @return string
	 */
	private static function text( $value, int $max, bool $multi = false ): string {
		if ( is_array( $value ) || is_object( $value ) ) {
			return '';
		}
		$value = $multi ? sanitize_textarea_field( (string) $value ) : sanitize_text_field( (string) $value );
		$value = trim( $value );
		return function_exists( 'mb_substr' ) ? mb_substr( $value, 0, $max ) : substr( $value, 0, $max );
	}

	/**
	 * Turn a list given as an array or as lines of text into a clean list.
	 *
	 * @param mixed $raw   Array or string (one item per line).
	 * @param int   $max   Max items.
	 * @param int   $chars Max characters per item.
	 * @return string[]
	 */
	private static function string_list( $raw, int $max, int $chars ): array {
		if ( is_string( $raw ) ) {
			$raw = preg_split( '/\r\n|\r|\n/', $raw ) ?: array();
		}
		if ( ! is_array( $raw ) ) {
			return array();
		}
		$out = array();
		foreach ( $raw as $item ) {
			$t = self::text( $item, $chars );
			if ( '' !== $t && ! in_array( $t, $out, true ) ) {
				$out[] = $t;
			}
			if ( count( $out ) >= $max ) {
				break;
			}
		}
		return $out;
	}

	/**
	 * One conversion {type, description, selector}.
	 *
	 * @param mixed  $raw   Raw value.
	 * @param string $field Field name for the error message.
	 * @return array|WP_Error
	 */
	private static function sanitize_conversion( $raw, string $field ) {
		$out = self::empty_conversion();
		if ( ! is_array( $raw ) ) {
			return $out;
		}
		$type = isset( $raw['type'] ) ? sanitize_key( (string) $raw['type'] ) : '';
		if ( '' !== $type && ! in_array( $type, self::CONVERSION_TYPES, true ) ) {
			return new WP_Error( 'spark_living_charter_conversion', sprintf( /* translators: %s: field name */ __( '%s.type must be form, call, booking or purchase.', 'spark-living' ), $field ), array( 'status' => 400 ) );
		}
		$out['type']        = $type;
		$out['description'] = self::text( $raw['description'] ?? '', 500 );
		$out['selector']    = isset( $raw['selector'] ) && '' !== trim( (string) $raw['selector'] ) ? Spark_Living_Util::sanitize_selector( $raw['selector'] ) : '';
		return $out;
	}

	/**
	 * A non-negative whole number or null.
	 *
	 * @param mixed  $raw   Raw value.
	 * @param string $field Field name for the error message.
	 * @return int|null|WP_Error
	 */
	private static function sanitize_budget_number( $raw, string $field ) {
		if ( null === $raw || '' === $raw ) {
			return null;
		}
		if ( ! is_numeric( $raw ) || (float) $raw < 0 || (float) $raw > 10000000 ) {
			return new WP_Error( 'spark_living_charter_speed', sprintf( /* translators: %s: field name */ __( 'speed_budget.%s must be a number of zero or more.', 'spark-living' ), $field ), array( 'status' => 400 ) );
		}
		return (int) round( (float) $raw );
	}

	/**
	 * One colour: a hex value or a short colour word.
	 *
	 * @param mixed $raw Raw value.
	 * @return string
	 */
	private static function colour( $raw ): string {
		$raw = trim( (string) $raw );
		if ( preg_match( '/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i', $raw ) ) {
			return strtolower( $raw );
		}
		return preg_match( '/^[A-Za-z][A-Za-z0-9 ()%,.-]{0,39}$/', $raw ) ? $raw : '';
	}

	/**
	 * Validate and clean a (partial) charter. Only known keys are read, so
	 * unknown keys are dropped. Fields that are absent are not part of the
	 * result. Version, updated_at and updated_by are never taken from input.
	 *
	 * @param array $in Raw input.
	 * @return array|WP_Error Cleaned fields.
	 */
	public static function sanitize( array $in ) {
		$out = array();

		if ( array_key_exists( 'business_name', $in ) ) {
			$out['business_name'] = self::text( $in['business_name'], 200 );
		}
		if ( array_key_exists( 'business_goal', $in ) ) {
			$out['business_goal'] = self::text( $in['business_goal'], 1000, true );
		}
		if ( array_key_exists( 'audience', $in ) ) {
			$out['audience'] = self::text( $in['audience'], 1000, true );
		}
		if ( array_key_exists( 'primary_conversion', $in ) ) {
			$c = self::sanitize_conversion( $in['primary_conversion'], 'primary_conversion' );
			if ( is_wp_error( $c ) ) {
				return $c;
			}
			$out['primary_conversion'] = $c;
		}
		if ( array_key_exists( 'secondary_conversions', $in ) ) {
			$list = array();
			$raw  = is_array( $in['secondary_conversions'] ) ? array_values( $in['secondary_conversions'] ) : array();
			foreach ( array_slice( $raw, 0, 10 ) as $i => $item ) {
				$c = self::sanitize_conversion( $item, 'secondary_conversions[' . $i . ']' );
				if ( is_wp_error( $c ) ) {
					return $c;
				}
				if ( '' !== $c['type'] || '' !== $c['description'] ) {
					$list[] = $c;
				}
			}
			$out['secondary_conversions'] = $list;
		}
		if ( array_key_exists( 'brand', $in ) ) {
			$b     = is_array( $in['brand'] ) ? $in['brand'] : array();
			$brand = array();
			if ( array_key_exists( 'colors', $b ) ) {
				$colors = array();
				foreach ( self::string_list( $b['colors'], 12, 40 ) as $c ) {
					$c = self::colour( $c );
					if ( '' !== $c ) {
						$colors[] = $c;
					}
				}
				$brand['colors'] = $colors;
			}
			if ( array_key_exists( 'fonts', $b ) ) {
				$brand['fonts'] = self::string_list( $b['fonts'], 8, 80 );
			}
			if ( array_key_exists( 'button_shape', $b ) ) {
				$brand['button_shape'] = self::text( $b['button_shape'], 60 );
			}
			if ( array_key_exists( 'voice_notes', $b ) ) {
				$brand['voice_notes'] = self::text( $b['voice_notes'], 1000, true );
			}
			$out['brand'] = $brand;
		}
		if ( array_key_exists( 'off_limits', $in ) ) {
			$out['off_limits'] = self::string_list( $in['off_limits'], 50, 200 );
		}
		if ( array_key_exists( 'autonomy_level', $in ) ) {
			$level = sanitize_key( (string) $in['autonomy_level'] );
			if ( ! in_array( $level, self::AUTONOMY_LEVELS, true ) ) {
				return new WP_Error( 'spark_living_charter_autonomy', __( 'autonomy_level must be suggest, tier1 or full.', 'spark-living' ), array( 'status' => 400 ) );
			}
			$out['autonomy_level'] = $level;
		}
		if ( array_key_exists( 'speed_budget', $in ) ) {
			$s      = is_array( $in['speed_budget'] ) ? $in['speed_budget'] : array();
			$budget = array();
			foreach ( array( 'load_ms', 'button_visible_ms', 'max_added_kb' ) as $k ) {
				if ( array_key_exists( $k, $s ) ) {
					$n = self::sanitize_budget_number( $s[ $k ], $k );
					if ( is_wp_error( $n ) ) {
						return $n;
					}
					$budget[ $k ] = $n;
				}
			}
			$out['speed_budget'] = $budget;
		}
		return $out;
	}

	/**
	 * Save (merge into the stored charter, raise the version by one) and write
	 * the ledger row.
	 *
	 * @param array  $in   Partial charter (see sanitize()).
	 * @param string $by   Who saved it (max 80 characters).
	 * @param array  $opts Optional: undo_of (ledger row id), summary.
	 * @return array|WP_Error The saved charter, with `change_id` of the ledger row.
	 */
	public static function save( array $in, string $by = '', array $opts = array() ) {
		$clean = self::sanitize( $in );
		if ( is_wp_error( $clean ) ) {
			return $clean;
		}
		$before = self::get();
		$after  = $before;
		foreach ( $clean as $key => $value ) {
			if ( in_array( $key, self::SUBOBJECTS, true ) && is_array( $value ) ) {
				$after[ $key ] = array_merge( $before[ $key ], $value ); // Keyed sub-object: merge field by field.
			} else {
				$after[ $key ] = $value;
			}
		}
		$by = '' !== $by ? $by : self::current_user_label();
		$by = function_exists( 'mb_substr' ) ? mb_substr( sanitize_text_field( $by ), 0, 80 ) : substr( sanitize_text_field( $by ), 0, 80 );

		$after['version']    = (int) $before['version'] + 1;
		$after['updated_at'] = Spark_Living_Util::mysql_utc();
		$after['updated_by'] = $by;

		update_option( self::OPTION, wp_json_encode( $after ), false );

		$changed = array();
		foreach ( $clean as $key => $value ) {
			if ( wp_json_encode( $before[ $key ] ?? null ) !== wp_json_encode( $after[ $key ] ?? null ) ) {
				$changed[] = $key;
			}
		}
		$summary = isset( $opts['summary'] ) ? (string) $opts['summary'] : (
			$changed
			? sprintf( /* translators: 1: version, 2: list of fields */ __( 'Site charter saved as version %1$d (changed: %2$s).', 'spark-living' ), $after['version'], implode( ', ', $changed ) )
			: sprintf( /* translators: %d: version */ __( 'Site charter saved as version %d (nothing changed).', 'spark-living' ), $after['version'] )
		);
		$change_id = Spark_Living_Ledger::record(
			array(
				'kind'         => 'charter_update',
				'subject_type' => 'charter',
				'subject_id'   => (string) $after['version'],
				'summary'      => $summary,
				'before'       => $before,
				'after'        => $after,
				'proposed_by'  => $by,
				'evidence'     => array_merge( array( 'changed_fields' => $changed ), isset( $opts['undo_of'] ) ? array( 'undo_of' => (int) $opts['undo_of'] ) : array() ),
				'undo'         => isset( $opts['undo_of'] ) ? array() : array(
					'action'         => 'restore_charter',
					'charter'        => $before,
					'expect_version' => (int) $after['version'],
				),
			)
		);
		$after['change_id'] = $change_id;
		return $after;
	}

	/**
	 * Label for the signed-in user (for updated_by).
	 *
	 * @return string
	 */
	private static function current_user_label(): string {
		$u = function_exists( 'wp_get_current_user' ) ? wp_get_current_user() : null;
		return ( $u && $u->exists() ) ? 'user:' . $u->user_login : 'owner';
	}

	/**
	 * Restore an earlier charter (an undo). The version still goes up by one.
	 *
	 * @param array  $charter  The charter to restore.
	 * @param string $by       Who did it.
	 * @param int    $undo_of  Ledger row being undone.
	 * @return array|WP_Error
	 */
	public static function restore( array $charter, string $by, int $undo_of ) {
		$keep = array();
		foreach ( array( 'business_name', 'business_goal', 'primary_conversion', 'secondary_conversions', 'audience', 'brand', 'off_limits', 'autonomy_level', 'speed_budget' ) as $k ) {
			if ( array_key_exists( $k, $charter ) ) {
				$keep[ $k ] = $charter[ $k ];
			}
		}
		return self::save(
			$keep,
			$by,
			array(
				'undo_of' => $undo_of,
				'summary' => sprintf( /* translators: 1: version restored to, 2: change id */ __( 'Site charter restored to the content of version %1$d (undo of change #%2$d).', 'spark-living' ), (int) ( $charter['version'] ?? 0 ), $undo_of ),
			)
		);
	}

	/**
	 * Display name of an autonomy level.
	 *
	 * @param string $level suggest, tier1 or full.
	 * @return string
	 */
	public static function autonomy_label( string $level ): string {
		$labels = array(
			'suggest' => __( 'Suggest only: agents may propose changes, a person queues them', 'spark-living' ),
			'tier1'   => __( 'Tier 1 on its own: agents may queue wording, look and order tests that passed the gate', 'spark-living' ),
			'full'    => __( 'Full: agents may queue tier 1 and tier 2 tests that passed the gate', 'spark-living' ),
		);
		return $labels[ $level ] ?? $level;
	}

	/**
	 * Display name of a conversion type.
	 *
	 * @param string $type form, call, booking or purchase.
	 * @return string
	 */
	public static function conversion_label( string $type ): string {
		$labels = array(
			'form'     => __( 'Form submission', 'spark-living' ),
			'call'     => __( 'Phone call', 'spark-living' ),
			'booking'  => __( 'Booking', 'spark-living' ),
			'purchase' => __( 'Purchase', 'spark-living' ),
		);
		return $labels[ $type ] ?? '';
	}
}
