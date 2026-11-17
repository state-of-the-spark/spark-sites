<?php
/**
 * Spark Living: the two capabilities (0.4.0).
 *
 *   spark_living_gate   may post a Goal Gate verdict (POST /suggestions/{id}/gate).
 *   spark_living_build  may create and queue suggestions, validate and preview a variant.
 *
 * Administrators (anyone with manage_options) have both without any role being
 * changed in the database: the capabilities are granted through the user_has_cap
 * filter. A separate user can be given just one of them (see the README), so a
 * Builder login cannot record its own verdict and a Judge login cannot build.
 *
 * @package SparkLiving
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Spark_Living_Caps {

	public const GATE  = 'spark_living_gate';
	public const BUILD = 'spark_living_build';

	/**
	 * Hook the filter.
	 */
	public static function init(): void {
		add_filter( 'user_has_cap', array( __CLASS__, 'grant_to_admins' ), 10, 1 );
	}

	/**
	 * Give both capabilities to anyone who can manage options.
	 *
	 * @param array $allcaps All capabilities of the user.
	 * @return array
	 */
	public static function grant_to_admins( $allcaps ) {
		if ( is_array( $allcaps ) && ! empty( $allcaps['manage_options'] ) ) {
			$allcaps[ self::GATE ]  = true;
			$allcaps[ self::BUILD ] = true;
		}
		return $allcaps;
	}

	/**
	 * May the current user read state, suggestions, the charter and the change log?
	 *
	 * @return bool
	 */
	public static function can_read(): bool {
		return current_user_can( 'manage_options' ) || current_user_can( self::GATE ) || current_user_can( self::BUILD );
	}

	/**
	 * May the current user create, queue and preview suggestions?
	 *
	 * @return bool
	 */
	public static function can_build(): bool {
		return current_user_can( 'manage_options' ) || current_user_can( self::BUILD );
	}

	/**
	 * May the current user record a Goal Gate verdict?
	 *
	 * @return bool
	 */
	public static function can_gate(): bool {
		return current_user_can( 'manage_options' ) || current_user_can( self::GATE );
	}

	/**
	 * May the current user do administrator things (conclude, undo, edit the charter, approve it)?
	 *
	 * @return bool
	 */
	public static function can_admin(): bool {
		return current_user_can( 'manage_options' );
	}
}
