<?php
	require( '../api/ccproto_client.php' );

	// your connect information
	define( 'HOST',		"127.0.0.1"	);	// YOUR HOST
	define( 'PORT',		MY PORT		);	// YOUR PORT
	define( 'USERNAME',	"mylogin"	);	// YOUR LOGIN
	define( 'PASSWORD',	"mypassword");	// YOUR PASSWORD

	define( 'PIC_FILE_NAME',	"pic.jpg"	);
    
	$ccp = new ccproto();
	$ccp->init();

	print( "Logging in..." );
	if( $ccp->login( HOST, PORT, USERNAME, PASSWORD ) < 0 ) {
		print( " FAILED\n" );
		return;
	} else {
		print( " OK\n" );
	}

	$system_load = 0;
	if( $ccp->system_load( $system_load ) != ccERR_OK ) {
		print( "system_load() FAILED\n" );
		return;
	}
	print( "System load=".$system_load." perc\n" );

	$balance = 0;
	if( $ccp->balance( $balance ) != ccERR_OK ) {
		print( "balance() FAILED\n" );
		return;
	}
	print( "Balance=".$balance."\n" );

	$major_id	= 0;
	$minor_id	= 0;
	for( $i = 0; $i < 3; $i++ ) {
		$pict = file_get_contents( PIC_FILE_NAME );
		$text = '';
		print( "sending a picture..." );

		$pict_to	= ptoDEFAULT;
		$pict_type	= ptUNSPECIFIED;
		
		$res = $ccp->picture2( $pict, $pict_to, $pict_type, $text, $major_id, $minor_id );
		switch( $res ) {
			// most common return codes
			case ccERR_OK:
				print( "got text for id=".$major_id."/".$minor_id.", type=".$pict_type.", to=".$pict_to.", text='".$text."'" );
				break;
			case ccERR_BALANCE:
				print( "not enough funds to process a picture, balance is depleted" );
				break;
			case ccERR_TIMEOUT:
				print( "picture has been timed out on server (payment not taken)" );
				break;
			case ccERR_OVERLOAD:
				print( "temporarily server-side error" );
				print( " server's overloaded, wait a little before sending a new picture" );
				break;
		
			// local errors
			case ccERR_STATUS:
				print( "local error." );
				print( " either ccproto_init() or ccproto_login() has not been successfully called prior to ccproto_picture()" );
				print( " need ccproto_init() and ccproto_login() to be called" );
				break;
		
			// network errors
			case ccERR_NET_ERROR:
				print( "network troubles, better to call ccproto_login() again" );
				break;
		
			// server-side errors
			case ccERR_TEXT_SIZE:
				print( "size of the text returned is too big" );
				break;
			case ccERR_GENERAL:
				print( "server-side error, better to call ccproto_login() again" );
				break;
			case ccERR_UNKNOWN:
				print( " unknown error, better to call ccproto_login() again" );
				break;
		
			default:
				// any other known errors?
				break;
		}
		print ( "\n" );

		// process a picture and if it is badly recognized 
		// call picture_bad2() to name it as error. 
		// pictures named bad are not charged

		//$ccp->picture_bad2( $major_id, $minor_id );
	}

	$balance = 0;
	if( $ccp->balance( $balance ) != ccERR_OK ) {
		print( "balance() FAILED\n" );
		return;
	}
	print( "Balance=".$balance."\n" );

	$ccp->close();

	// also you can mark picture as bad after session is closed, but you need to be logged in again
	$ccp->init();
	print( "Logging in..." );
	if( $ccp->login( HOST, PORT, USERNAME, PASSWORD ) < 0 ) {
		print( " FAILED\n" );
		return;
	} else {
		print( " OK\n" );
	}
	print( "Naming picture ".$major_id."/".$minor_id." as bad\n" );
	$ccp->picture_bad2( $major_id, $minor_id );
	$ccp->close();


?>
