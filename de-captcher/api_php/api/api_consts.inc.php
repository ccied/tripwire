<?php

	//	ERROR CODES
	if( !defined( 'ccERR_OK'		) )	define( 'ccERR_OK',			0		);	//	everything went OK
	if( !defined( 'ccERR_GENERAL'	) )	define( 'ccERR_GENERAL',	-1		);	//	general internal error
	if( !defined( 'ccERR_STATUS'	) )	define( 'ccERR_STATUS',		-2		);	//	status is not correct
	if( !defined( 'ccERR_NET_ERROR'	) )	define( 'ccERR_NET_ERROR',	-3		);	//	network data transfer error
	if( !defined( 'ccERR_TEXT_SIZE'	) )	define( 'ccERR_TEXT_SIZE',	-4		);	//	text is not of an appropriate size
	if( !defined( 'ccERR_OVERLOAD'	) )	define( 'ccERR_OVERLOAD',	-5		);	//	server's overloaded
	if( !defined( 'ccERR_BALANCE'	) )	define( 'ccERR_BALANCE',	-6		);	//	not enough funds to complete the request
	if( !defined( 'ccERR_TIMEOUT'	) )	define( 'ccERR_TIMEOUT',	-7		);	//	request timed out
	if( !defined( 'ccERR_BAD_PARAMS') )	define( 'ccERR_BAD_PARAMS',	-8		);	//	provided parameters are not good for this function
	if( !defined( 'ccERR_UNKNOWN'	) )	define( 'ccERR_UNKNOWN',	-200	);	//	unknown error

	//	picture processing TIMEOUTS
	if( !defined( 'ptoDEFAULT'		) )	define( 'ptoDEFAULT',		0		);	//	default timeout, server-specific
	if( !defined( 'ptoLONG'			) )	define( 'ptoLONG',			1		);	//	long timeout for picture, server-specfic
	if( !defined( 'pto30SEC'		) )	define( 'pto30SEC',			2		);	//	30 seconds timeout for picture
	if( !defined( 'pto60SEC'		) )	define( 'pto60SEC',			3		);	//	60 seconds timeout for picture
	if( !defined( 'pto90SEC'		) )	define( 'pto90SEC',			4		);	//	90 seconds timeout for picture

	//	picture processing TYPES
	if( !defined( 'ptUNSPECIFIED'		) )	define( 'ptUNSPECIFIED',		0	);	//	unspecified
	if( !defined( 'ptASIRRA'			) )	define( 'ptASIRRA',				86	);	//	ASIRRA pictures
	if( !defined( 'ptTEXT'				) )	define( 'ptTEXT',				83	);	//	TEXT questions
	if( !defined( 'ptMULTIPART'			) )	define( 'ptMULTIPART',			82	);	//	MULTIPART quetions

	// multi-picture processing specifics
	if( !defined( 'ptASIRRA_PICS_NUM'	) ) define( 'ptASIRRA_PICS_NUM',	12	);
	if( !defined( 'ptMULTIPRAT_PICS_NUM') ) define( 'ptMULTIPART_PICS_NUM',	20	);
