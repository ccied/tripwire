<?php

	if( !defined( 'CC_PROTO_VER'			) )	define(	'CC_PROTO_VER',				1		);		//	protocol version
	if( !defined( 'CC_RAND_SIZE'			) )	define(	'CC_RAND_SIZE',				256		);		//	size of the random sequence for authentication procedure
	if( !defined( 'CC_MAX_TEXT_SIZE'		) )	define(	'CC_MAX_TEXT_SIZE',			100		);		//	maximum characters in returned text for picture
	if( !defined( 'CC_MAX_LOGIN_SIZE'		) )	define(	'CC_MAX_LOGIN_SIZE',		100		);		//	maximum characters in login string
	if( !defined( 'CC_MAX_PICTURE_SIZE'		) )	define(	'CC_MAX_PICTURE_SIZE',		200000	);		//	200 K bytes for picture seems sufficient for all purposes
	if( !defined( 'CC_HASH_SIZE'			) )	define(	'CC_HASH_SIZE',				32		);

	if( !defined( 'cmdCC_UNUSED'			) )	define( 'cmdCC_UNUSED',				0		);
	if( !defined( 'cmdCC_LOGIN'				) )	define(	'cmdCC_LOGIN',				1		);		//	login
	if( !defined( 'cmdCC_BYE'				) )	define(	'cmdCC_BYE',				2		);		//	end of session
	if( !defined( 'cmdCC_RAND'				) )	define(	'cmdCC_RAND',				3		);		//	random data for making hash with login+password
	if( !defined( 'cmdCC_HASH'				) )	define(	'cmdCC_HASH',				4		);		//	hash data
	if( !defined( 'cmdCC_PICTURE'			) )	define(	'cmdCC_PICTURE',			5		);		//	picture data, deprecated
	if( !defined( 'cmdCC_TEXT'				) )	define(	'cmdCC_TEXT',				6		);		//	text data, deprecated
	if( !defined( 'cmdCC_OK'				) )	define(	'cmdCC_OK',					7		);		//
	if( !defined( 'cmdCC_FAILED'			) )	define(	'cmdCC_FAILED',				8		);		//
	if( !defined( 'cmdCC_OVERLOAD'			) )	define(	'cmdCC_OVERLOAD',			9		);		//
	if( !defined( 'cmdCC_BALANCE'			) )	define(	'cmdCC_BALANCE',			10		);		//	zero balance
	if( !defined( 'cmdCC_TIMEOUT'			) )	define(	'cmdCC_TIMEOUT',			11		);		//	time out occured
	if( !defined( 'cmdCC_PICTURE2'			) )	define( 'cmdCC_PICTURE2',			12		);		//	picture data
	if( !defined( 'cmdCC_PICTUREFL'			) )	define( 'cmdCC_PICTUREFL',			13		);		//	picture failure
	if( !defined( 'cmdCC_TEXT2'				) )	define( 'cmdCC_TEXT2',				14		);		//	text data
	if( !defined( 'cmdCC_SYSTEM_LOAD'		) )	define( 'cmdCC_SYSTEM_LOAD',		15		);		//	system load
	if( !defined( 'cmdCC_BALANCE_TRANSFER'	) )	define(	'cmdCC_BALANCE_TRANSFER',	16		);		//	zero balance

	if( !defined( 'SIZEOF_CC_PACKET'				) )	define( 'SIZEOF_CC_PACKET',					6			);
	if( !defined( 'SIZEOF_CC_PICT_DESCR'			) )	define(	'SIZEOF_CC_PICT_DESCR',				20			);
	if( !defined( 'SIZEOF_CC_BALANCE_TRANSFER_DESC'	) )	define(	'SIZEOF_CC_BALANCE_TRANSFER_DESC',	8			);
	
	if( !defined( 'CC_I_MAGIC'	) )	define( 'CC_I_MAGIC',						268435455	);
	if( !defined( 'CC_Q_MAGIC'	) )	define( 'CC_Q_MAGIC',						268435440	);

	require_once( 'api_consts.inc.php' );

/**
 *	packet class
 */
class cc_packet {

	var	$ver	= CC_PROTO_VER;	//	version of the protocol
	var	$cmd	= cmdCC_BYE;	//	command, see cc_cmd_t
	var	$size	= 0;			//	data size in consequent bytes 
	var	$data	= '';			//	packet payload

	/**
	 *
	 */
	function checkPackHdr( $cmd = NULL, $size = NULL ) {
		if( $this->ver != CC_PROTO_VER )
			return FALSE;
		if( isset( $cmd ) && ($this->cmd != $cmd) )
			return FALSE;
		if( isset( $size ) && ($this->size != $size) )
			return FALSE;

		return TRUE;
	}

	/**
	 *
	 */
	function pack() {
		return pack( 'CCV', $this->ver, $this->cmd, $this->size ) . $this->data;
	}

	/**
	 *
	 */
	function packTo( $handle ) {
		return fwrite( $handle, $this->pack(), SIZEOF_CC_PACKET + strlen( $this->data ) );
	}

	/**
	 *
	 */
	function unpackHeader( $bin ) {
		$arr = unpack( 'Cver/Ccmd/Vsize', $bin );
		$this->ver	= $arr['ver'];
		$this->cmd	= $arr['cmd'];
		$this->size	= $arr['size'];
	}

	/**
	 *
	 */
	function unpackFrom( $handle, $cmd = NULL, $size = NULL ) {
		if( ($bin = stream_get_contents( $handle, SIZEOF_CC_PACKET )) === FALSE ) {
			return FALSE;
		}

		if( strlen( $bin ) < SIZEOF_CC_PACKET ) {
			return FALSE;
		}
		
		$this->unpackHeader( $bin );

		if( $this->checkPackHdr( $cmd, $size ) === FALSE ) {
			return FALSE;
		}

		if( $this->size > 0 ) {
			if( ($bin = stream_get_contents( $handle, $this->size )) === FALSE ) {
				return FALSE;
			}
			$this->data = $bin;
		} else {
			$this->data = '';
		}
		
		return TRUE;
	}

	/**
	 *
	 */
	function setVer( $ver ) {
		$this->ver = $ver;
	}

	/**
	 *
	 */
	function getVer() {
		return $this->ver;
	}

	/**
	 *
	 */
	function setCmd( $cmd ) {
		$this->cmd = $cmd;
	}

	/**
	 *
	 */
	function getCmd() {
		return $this->cmd;
	}

	/**
	 *
	 */
	function setSize( $size ) {
		$this->size = $size;
	}

	/**
	 *
	 */
	function getSize() {
		return $this->size;
	}

	/**
	 *
	 */
	function calcSize() {
		$this->size = strlen( $this->data );
		return $this->size;
	}

	/**
	 *
	 */
	function getFullSize() {
		return SIZEOF_CC_PACKET + $this->size;
	}

	/**
	 *
	 */
	function setData( $data ) {
		$this->data = $data;
	}

	/**
	 *
	 */
	function getData() {
		return $this->data;
	}
}

/**
 *	picture description class
 */
class cc_pict_descr {
	var	$timeout	= ptoDEFAULT;
	var	$type		= ptUNSPECIFIED;
	var	$size		= 0;
	var	$major_id	= 0;
	var	$minor_id	= 0;
	var $data		= '';

	/**
	 *
	 */
	function pack() {
		return pack( 'VVVVV', $this->timeout, $this->type, $this->size, $this->major_id, $this->minor_id ) . $this->data;
	}

	/**
	 *
	 */
	function unpack( $bin ) {
		$arr = unpack( 'Vtimeout/Vtype/Vsize/Vmajor_id/Vminor_id', $bin );
		$this->timeout	= $arr['timeout'];
		$this->type		= $arr['type'];
		$this->size		= $arr['size'];
		$this->major_id	= $arr['major_id'];
		$this->minor_id	= $arr['minor_id'];
		if( strlen( $bin ) > SIZEOF_CC_PICT_DESCR ) {
			$this->data		= substr( $bin, SIZEOF_CC_PICT_DESCR );
		} else {
			$this->data = '';
		}
	}

	/**
	 *
	 */
	function setTimeout( $to ) {
		$this->timeout = $to;
	}

	/**
	 *
	 */
	function getTimeout() {
		return $this->timeout;
	}

	/**
	 *
	 */
	function setType( $type ) {
		$this->type = $type;
	}

	/**
	 *
	 */
	function getType() {
		return $this->type;
	}

	/**
	 *
	 */
	function setSize( $size ) {
		$this->size = $size;
	}

	/**
	 *
	 */
	function getSize() {
		return $this->size;
	}

	/**
	 *
	 */
	function calcSize() {
		$this->size = strlen( $this->data );
		return $this->size;
	}

	/**
	 *
	 */
	function getFullSize() {
		return SIZEOF_CC_PICT_DESCR + $this->size;
	}

	/**
	 *
	 */
	function setMajorID( $major_id ) {
		$this->major_id = $major_id;
	}

	/**
	 *
	 */
	function getMajorID() {
		return $this->major_id;
	}

	/**
	 *
	 */
	function setMinorID( $minor_id ) {
		$this->minor_id = $minor_id;
	}

	/**
	 *
	 */
	function getMinorID() {
		return $this->minor_id;
	}

	/**
	 *
	 */
	function setData( $data ) {
		$this->data = $data;
	}

	/**
	 *
	 */
	function getData() {
		return $this->data;
	}
}

/**
 *	balance transfer description class
 */
class cc_balance_transfer_descr {
	var	$sum		= 0;
	var $to_length	= 0;
	var	$to			= '';

	/**
	 *
	 */
	function pack() {
		return pack( 'VV', $this->sum, $this->to_length ) . $this->to;
	}

	/**
	 *
	 */
	function unpack( $bin ) {
		$arr = unpack( 'Vsum/Vto_length', $bin );
		$this->sum			= $arr['sum'];
		$this->to_length	= $arr['to_length'];
		if( strlen( $bin ) > SIZEOF_CC_BALANCE_TRANSFER_DESC ) {
			$this->to		= substr( $bin, SIZEOF_CC_BALANCE_TRANSFER_DESC );
		} else {
			$this->to = '';
		}
	}

	/**
	 *
	 */
	function setSum( $sum ) {
		$this->sum = $sum;
	}

	/**
	 *
	 */
	function getSum() {
		return $this->sum;
	}

	/**
	 *
	 */
	function setTo( $to ) {
		$this->to = $to;
	}

	/**
	 *
	 */
	function getTo() {
		return $this->to;
	}

	/**
	 *
	 */
	function calcSize() {
		$this->to_length = strlen( $this->to );
		return $this->to_length;
	}

	/**
	 *
	 */
	function getFullSize() {
		return SIZEOF_CC_BALANCE_TRANSFER_DESC + $this->to_length;
	}

}
