<?php

require_once( 'ccproto.inc.php' );
require_once( 'api_consts.inc.php' );

ini_set( 'max_execution_time', 0 );

define(	'sCCC_INIT',		1		);		//	initial status, ready to issue LOGIN on client
define(	'sCCC_LOGIN',		2		);		//	LOGIN is sent, waiting for RAND (login accepted) or CLOSE CONNECTION (login is unknown)	
define(	'sCCC_HASH',		3		);		//	HASH is sent, server may CLOSE CONNECTION (hash is not recognized)
define(	'sCCC_PICTURE',		4		);

/**
 *	CC protocol class
 */
class ccproto {
	var	$status;
	var	$s;
	var $context;

	/**
	 *
	 */
	function init() {
		$this->status = sCCC_INIT;
	} // init()

	/**
	 *
	 */
	function login( $hostname, $port, $login, $pwd, $ssl = FALSE ) {
		$this->status = sCCC_INIT;

		$errnum = 0;
		$errstr = '';
		$transport = 'tcp';

		$this->context = stream_context_create();
		if( $ssl ) {
			$transport = 'ssl';
			$result = stream_context_set_option( $this->context, 'ssl', 'allow_self_signed', TRUE );
		}
		
		if(( $this->s = @stream_socket_client( "$transport://$hostname:$port", $errnum, $errstr, ini_get( "default_socket_timeout" ) , STREAM_CLIENT_CONNECT, $this->context )) === FALSE ) {
			print( 'We have a stream_socket_client() error: ' . $errstr . ' (' . $errnum . ')'."\n" );
			return ccERR_NET_ERROR;
		}

		$pack = new cc_packet();
		$pack->setVer( CC_PROTO_VER );

		$pack->setCmd( cmdCC_LOGIN );
		$pack->setSize( strlen( $login ) );
		$pack->setData( $login );

		if( $pack->packTo( $this->s ) === FALSE ) {
			return ccERR_NET_ERROR;
		}

		if( $pack->unpackFrom( $this->s, cmdCC_RAND, CC_RAND_SIZE ) === FALSE ) {
			return ccERR_NET_ERROR;
		}

		$shabuf = NULL;
		$shabuf .= $pack->getData();
		$shabuf .= md5( $pwd );
		$shabuf .= $login;
		
		$pack->setCmd( cmdCC_HASH );
		$pack->setSize( CC_HASH_SIZE );
		$pack->setData( hash( 'sha256', $shabuf, TRUE ) );
		
		if( $pack->packTo( $this->s ) === FALSE ) {
			return ccERR_NET_ERROR;
		}
		
		if( $pack->unpackFrom( $this->s, cmdCC_OK ) === FALSE ) {
			return ccERR_NET_ERROR;
		}

		$this->status = sCCC_PICTURE;

		return ccERR_OK;
	} // login()

	/**
	 *
	 */
	function picture2( 
		$pict,				//	IN		picture binary data
		&$pict_to, 			//	IN/OUT	timeout specifier to be used, on return - really used specifier, see ptoXXX constants, ptoDEFAULT in case of unrecognizable
		&$pict_type, 		//	IN/OUT	type specifier to be used, on return - really used specifier, see ptXXX constants, ptUNSPECIFIED in case of unrecognizable
		&$text,				//	OUT	text
		&$major_id = NULL,	//	OUT	OPTIONAL	major part of the picture ID
		&$minor_id = NULL	//	OUT OPTIONAL	minor part of the picture ID
	) {
		if( $this->status != sCCC_PICTURE )
			return ccERR_STATUS;

		$pack = new cc_packet();
		$pack->setVer( CC_PROTO_VER );
		$pack->setCmd( cmdCC_PICTURE2 );

		$desc = new cc_pict_descr();
		$desc->setTimeout( ptoDEFAULT );
		$desc->setType( $pict_type );
		$desc->setMajorID( 0 );
		$desc->setMinorID( 0 );
		$desc->setData( $pict );
		$desc->calcSize();
		
		$pack->setData( $desc->pack() );
		$pack->calcSize();

		if( $pack->packTo( $this->s ) === FALSE ) {
			return ccERR_NET_ERROR;
		}

		if( $pack->unpackFrom( $this->s ) === FALSE ) {
			return ccERR_NET_ERROR;
		}
		
		switch( $pack->getCmd() ) {
			case cmdCC_TEXT2:
				$desc->unpack( $pack->getData() );
				$pict_to	= $desc->getTimeout();
				$pict_type	= $desc->getType();
				$text		= $desc->getData();

				if( isset( $major_id ) )
					$major_id	= $desc->getMajorID();
				if( isset( $minor_id ) )
					$minor_id	= $desc->getMinorID();
				return ccERR_OK;

			case cmdCC_BALANCE:
				// balance depleted
				return ccERR_BALANCE;
			
			case cmdCC_OVERLOAD:
				// server's busy
				return ccERR_OVERLOAD;
			
			case cmdCC_TIMEOUT:
				// picture timed out
				return ccERR_TIMEOUT;
			
			case cmdCC_FAILED:
				// server's error
				return ccERR_GENERAL;
			
			default:
				// unknown error
				return ccERR_UNKNOWN;
		}

		return ccERR_UNKNOWN;
	} // picture2()

	/**
	 *
	 */
	function picture_multipart( 
		$pics,				//	IN array of pictures binary data
		$questions,			//	IN array of questions
		&$pict_to, 			//	IN/OUT	timeout specifier to be used, on return - really used specifier, see ptoXXX constants, ptoDEFAULT in case of unrecognizable
		&$pict_type, 		//	IN/OUT	type specifier to be used, on return - really used specifier, see ptXXX constants, ptUNSPECIFIED in case of unrecognizable
		&$text,				//	OUT	text
		&$major_id,			//	OUT	major part of the picture ID
		&$minor_id			//	OUT minor part of the picture ID
	) {

		if( !isset( $pics ) ) {
			// $pics - should have a pic
			return ccERR_BAD_PARAMS;
		}
		
		if( !is_array( $pics ) ) {
			// $pics should be an array
			$pics = array( $pics );
		}
		
		if( isset( $questions ) && !is_array( $questions ) ) {
			$questions = array( $questions );
		}
		
		$pack = '';
	
		switch( $pict_type ) {
		
			case ptASIRRA:
				// ASIRRA must have ptASIRRA_PICS_NUM pictures
				if( count( $pics ) != ptASIRRA_PICS_NUM ) {
					return ccERR_BAD_PARAMS;
				}
				
				// combine all images into one bunch
				$pack = '';
				foreach( $pics as &$pic ) {
					$pack .= pack( "V", strlen( $pic ) );
					$pack .= $pic;
				}
				break;
				
			case ptMULTIPART:
				// MULTIPART image should have reasonable number of pictures
				if( count( $pics ) > ptMULTIPART_PICS_NUM ) {
					return ccERR_BAD_PARAMS;
				}
				
				if( is_array( $questions ) && (count( $questions ) > ptMULTIPART_PICS_NUM) ) {
					return ccERR_BAD_PARAMS;
				}
				
				// combine all images into one bunch
				$size = count( $pics ) * 4;
				foreach( $pics as &$pic ) {
					$size += strlen( $pic );
				}
				
				$pack = '';
 				$pack .= pack( "V", CC_I_MAGIC );		// i_magic
				$pack .= pack( "V", count( $pics ) );	// N
				$pack .= pack( "V", $size );			// size
				foreach( $pics as &$pic ) {
					$pack .= pack( "V", strlen( $pic ) );
					$pack .= $pic;
				}
				
				if( is_array( $questions ) ) {
					// combine all questions into one bunch
					$size = count( $questions ) * 4;
					foreach( $questions as &$question ) {
						$size += strlen( $question );
					}
					
					$pack .= pack( "V", CC_Q_MAGIC );			// q_magic
					$pack .= pack( "V", count( $questions ) );	// N
					$pack .= pack( "V", $size );				// size
					foreach( $questions as &$question ) {
						$pack .= pack( "V", strlen( $question ) );
						$pack .= $question;
					}
				} // if( is_array( $texts ) )
				break;
				
			default:
				// we serve only ASIRRA multipart pictures so far
				return ccERR_BAD_PARAMS;
				break;
		} // switch( pict_type )
	
	
		return $this->picture2( $pack, $pict_to, $pict_type, $text, $major_id, $minor_id );
	} // picture_asirra()

	/**
	 *
	 */
	function picture_bad2( $major_id, $minor_id ) {
		$pack = new cc_packet();

		$pack->setVer( CC_PROTO_VER );
		$pack->setCmd( cmdCC_PICTUREFL );

		$desc = new cc_pict_descr();
		$desc->setTimeout( ptoDEFAULT );
		$desc->setType( ptUNSPECIFIED );
		$desc->setMajorID( $major_id );
		$desc->setMinorID( $minor_id );
		$desc->calcSize();
		
		$pack->setData( $desc->pack() );
		$pack->calcSize();

		if( $pack->packTo( $this->s ) === FALSE ) {
			return ccERR_NET_ERROR;
		}

		return ccERR_OK;
	} // picture_bad2()
	
	/**
	 *
	 */
	function balance( &$balance ) {
		if( $this->status != sCCC_PICTURE )
			return ccERR_STATUS;

		$pack = new cc_packet();
		$pack->setVer( CC_PROTO_VER );
		$pack->setCmd( cmdCC_BALANCE );
		$pack->setSize( 0 );

		if( $pack->packTo( $this->s ) === FALSE ) {
			return ccERR_NET_ERROR;
		}

		if( $pack->unpackFrom( $this->s ) === FALSE ) {
			return ccERR_NET_ERROR;
		}
		
		switch( $pack->getCmd() ) {
			case cmdCC_BALANCE:
				$balance = $pack->getData();
				return ccERR_OK;

			default:
				// unknown error
				return ccERR_UNKNOWN;
		}
	} // balance()

	/**
	 * $sum should be int
	 * $to should be string
	 */
	function balance_transfer( $sum, $to ) {
		if( $this->status != sCCC_PICTURE )
			return ccERR_STATUS;

		if( !is_int( $sum ) )
			return ccERR_BAD_PARAMS;

		if( !is_string( $to ) )
			return ccERR_BAD_PARAMS;

		if( $sum <= 0 ) {
			return ccERR_BAD_PARAMS;
		}

		$pack = new cc_packet();
		$pack->setVer( CC_PROTO_VER );
		$pack->setCmd( cmdCC_BALANCE_TRANSFER );

		$desc = new cc_balance_transfer_descr();
		$desc->setTo( $to );
		$desc->setSum( $sum );
		$desc->calcSize();

		$pack->setData( $desc->pack() );
		$pack->calcSize();

		if( $pack->packTo( $this->s ) === FALSE ) {
			return ccERR_NET_ERROR;
		}

		if( $pack->unpackFrom( $this->s ) === FALSE ) {
			return ccERR_NET_ERROR;
		}

		switch( $pack->getCmd() ) {
			case cmdCC_OK:
				return ccERR_OK;

			default:
				// unknown error
				return ccERR_GENERAL;
		}

	} // balance_tansfer()
	
	/**
	 *
	 */
	function system_load( &$system_load ) {
		if( $this->status != sCCC_PICTURE )
			return ccERR_STATUS;

		$pack = new cc_packet();
		$pack->setVer( CC_PROTO_VER );
		$pack->setCmd( cmdCC_SYSTEM_LOAD );
		$pack->setSize( 0 );

		if( $pack->packTo( $this->s ) === FALSE ) {
			return ccERR_NET_ERROR;
		}

		if( $pack->unpackFrom( $this->s ) === FALSE ) {
			return ccERR_NET_ERROR;
		}
	
		if( $pack->getSize() != 1 ) {
			return ccERR_UNKNOWN;
		}

		switch( $pack->getCmd() ) {
			case cmdCC_SYSTEM_LOAD:
				$arr = unpack( 'Csysload', $pack->getData() );
				$system_load = $arr['sysload'];
				return ccERR_OK;

			default:
				// unknown error
				return ccERR_UNKNOWN;
		}
	} // system_load()

	/**
	 *
	 */
	function close() {
		$pack = new cc_packet();
		$pack->setVer( CC_PROTO_VER );

		$pack->setCmd( cmdCC_BYE );
		$pack->setSize( 0 );

		if( $pack->packTo( $this->s ) === FALSE ) {
			// return ccERR_NET_ERROR;
		}

		fclose( $this->s );
		$this->status = sCCC_INIT;

		return ccERR_NET_ERROR;
	} // close()

	/**
	 *
	 */
	function closes() {
		$pack = new cc_packet();
		$pack->setVer( CC_PROTO_VER );

		$pack->setCmd( cmdCC_OK );
		$pack->setSize( 0 );

		if( $pack->packTo( $this->s ) === FALSE ) {
			return ccERR_NET_ERROR;
		}
		
		if( $pack->unpackFrom( $this->s, cmdCC_OK ) === FALSE ) {
			// return ccERR_NET_ERROR;
		}

		fclose( $this->s );
		$this->status = sCCC_INIT;

		return ccERR_NET_ERROR;
	} // close()
	
	///////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////

	/**
	 *	deprecated functions section. still operational, but better not to be used
	 */

	/**
	 *
	 */
	function picture( $pict, &$text ) {
		if( $this->status != sCCC_PICTURE )
			return ccERR_STATUS;

		$pack = new cc_packet();
		$pack->setVer( CC_PROTO_VER );

		$pack->setCmd( cmdCC_PICTURE );
		$pack->setSize( strlen( $pict ) );
		$pack->setData( $pict );

		if( $pack->packTo( $this->s ) === FALSE ) {
			return ccERR_NET_ERROR;
		}

		if( $pack->unpackFrom( $this->s ) === FALSE ) {
			return ccERR_NET_ERROR;
		}
		
		switch( $pack->getCmd() ) {
			case cmdCC_TEXT:
				$text = $pack->getData();
				return ccERR_OK;

			case cmdCC_BALANCE:
				// balance depleted
				return ccERR_BALANCE;
			
			case cmdCC_OVERLOAD:
				// server's busy
				return ccERR_OVERLOAD;
			
			case cmdCC_TIMEOUT:
				// picture timed out
				return ccERR_TIMEOUT;
			
			case cmdCC_FAILED:
				// server's error
				return ccERR_GENERAL;
			
			default:
				// unknown error
				return ccERR_UNKNOWN;
		}
	} // picture()

	/**
	 *
	 */
	function picture_bad() {
		$pack = new cc_packet();
		$pack->setVer( CC_PROTO_VER );

		$pack->setCmd( cmdCC_FAILED );
		$pack->setSize( 0 );

		if( $pack->packTo( $this->s ) === FALSE ) {
			return ccERR_NET_ERROR;
		}

		return ccERR_NET_ERROR;
	} // picture_bad()

}
