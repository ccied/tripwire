--
-- PostgreSQL database dump
--

-- Dumped from database version 9.0.4
-- Dumped by pg_dump version 9.5.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'SQL_ASCII';
SET standard_conforming_strings = off;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET escape_string_warning = off;
SET row_security = off;

SET search_path = public, pg_catalog;

--
-- Name: _unchecked_dns_name; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN _unchecked_dns_name AS character varying(255);


--
-- Name: dns_name_valid(_unchecked_dns_name); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION dns_name_valid(_unchecked_dns_name) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/mastodon', 'dns_name_valid_udf';


--
-- Name: _dns_name; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN _dns_name AS _unchecked_dns_name
	CONSTRAINT _dns_name_check CHECK (dns_name_valid(VALUE));


--
-- Name: _old_reg_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE _old_reg_status AS ENUM (
    'unconfirmed',
    'email-clicked',
    'verified',
    'failed',
    'possible'
);


--
-- Name: _unchecked_url; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN _unchecked_url AS character varying(2600);


--
-- Name: url_valid(_unchecked_url); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION url_valid(_unchecked_url) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/mastodon', 'url_valid_udf';


--
-- Name: _url; Type: DOMAIN; Schema: public; Owner: -
--

CREATE DOMAIN _url AS _unchecked_url
	CONSTRAINT _url_check CHECK (url_valid(VALUE));


--
-- Name: crawl_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE crawl_status AS ENUM (
    'registered',
    'filled',
    'partial',
    'no_reg',
    'unknown',
    'uncrawled'
);


--
-- Name: gender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE gender AS ENUM (
    'male',
    'female',
    'other'
);


--
-- Name: ip4; Type: SHELL TYPE; Schema: public; Owner: -
--

CREATE TYPE ip4;


--
-- Name: ip4_in(cstring); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_in(cstring) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_in';


--
-- Name: ip4_out(ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_out(ip4) RETURNS cstring
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_out';


--
-- Name: ip4_recv(internal); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_recv(internal) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_recv';


--
-- Name: ip4_send(ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_send(ip4) RETURNS bytea
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_send';


--
-- Name: ip4; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE ip4 (
    INTERNALLENGTH = 4,
    INPUT = ip4_in,
    OUTPUT = ip4_out,
    RECEIVE = ip4_recv,
    SEND = ip4_send,
    ALIGNMENT = int4,
    STORAGE = plain,
    PASSEDBYVALUE
);


--
-- Name: TYPE ip4; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE ip4 IS 'IPv4 address ''#.#.#.#''';


--
-- Name: ip4r; Type: SHELL TYPE; Schema: public; Owner: -
--

CREATE TYPE ip4r;


--
-- Name: ip4r_in(cstring); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_in(cstring) RETURNS ip4r
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_in';


--
-- Name: ip4r_out(ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_out(ip4r) RETURNS cstring
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_out';


--
-- Name: ip4r_recv(internal); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_recv(internal) RETURNS ip4r
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_recv';


--
-- Name: ip4r_send(ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_send(ip4r) RETURNS bytea
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_send';


--
-- Name: ip4r; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE ip4r (
    INTERNALLENGTH = 8,
    INPUT = ip4r_in,
    OUTPUT = ip4r_out,
    RECEIVE = ip4r_recv,
    SEND = ip4r_send,
    ELEMENT = ip4,
    ALIGNMENT = int4,
    STORAGE = plain
);


--
-- Name: TYPE ip4r; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE ip4r IS 'IPv4 range ''#.#.#.#-#.#.#.#'' or ''#.#.#.#/#'' or ''#.#.#.#''';


--
-- Name: lang_class; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE lang_class AS ENUM (
    'possible-english',
    'english',
    'unknown',
    'short',
    'non-english'
);


--
-- Name: reg_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE reg_status AS ENUM (
    'unconfirmed',
    'email-clicked',
    'verified',
    'failed',
    'possible',
    'unknown'
);


--
-- Name: add_reg(character varying, character varying, integer, _old_reg_status); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION add_reg(character varying, character varying, integer, _old_reg_status) RETURNS integer
    LANGUAGE sql
    AS $_$
    UPDATE identities SET "in_use" = true where iid = $3;
    INSERT INTO registrations (site, version, iid, status) VALUES
        ($1, $2, $3, $4) RETURNING "rid";
$_$;


--
-- Name: cidr(ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION cidr(ip4) RETURNS cidr
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_cast_to_cidr';


--
-- Name: cidr(ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION cidr(ip4r) RETURNS cidr
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_cast_to_cidr';


--
-- Name: dns_pub_suffix(_dns_name); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION dns_pub_suffix(_dns_name) RETURNS _dns_name
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/mastodon', 'dns_pub_suffix_udf';


--
-- Name: dns_reg_domain(_dns_name); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION dns_reg_domain(_dns_name) RETURNS _dns_name
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/mastodon', 'dns_reg_domain_udf';


--
-- Name: dns_suffixes(_dns_name); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION dns_suffixes(_dns_name) RETURNS character varying[]
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/mastodon', 'dns_suffixes_udf';


--
-- Name: fix_site_status_overwrite(character varying, character varying, _old_reg_status); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION fix_site_status_overwrite(un character varying, site character varying, status _old_reg_status) RETURNS void
    LANGUAGE sql
    AS $_$
    UPDATE registrations SET site = $2, status = $3
        WHERE rid = (SELECT rid_from_username( $1 ));
$_$;


--
-- Name: gip4r_compress(internal); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION gip4r_compress(internal) RETURNS internal
    LANGUAGE c
    AS '$libdir/ip4r', 'gip4r_compress';


--
-- Name: gip4r_consistent(internal, ip4r, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION gip4r_consistent(internal, ip4r, integer) RETURNS boolean
    LANGUAGE c
    AS '$libdir/ip4r', 'gip4r_consistent';


--
-- Name: gip4r_decompress(internal); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION gip4r_decompress(internal) RETURNS internal
    LANGUAGE c
    AS '$libdir/ip4r', 'gip4r_decompress';


--
-- Name: gip4r_penalty(internal, internal, internal); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION gip4r_penalty(internal, internal, internal) RETURNS internal
    LANGUAGE c STRICT
    AS '$libdir/ip4r', 'gip4r_penalty';


--
-- Name: gip4r_picksplit(internal, internal); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION gip4r_picksplit(internal, internal) RETURNS internal
    LANGUAGE c
    AS '$libdir/ip4r', 'gip4r_picksplit';


--
-- Name: gip4r_same(ip4r, ip4r, internal); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION gip4r_same(ip4r, ip4r, internal) RETURNS internal
    LANGUAGE c
    AS '$libdir/ip4r', 'gip4r_same';


--
-- Name: gip4r_union(internal, internal); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION gip4r_union(internal, internal) RETURNS ip4r
    LANGUAGE c
    AS '$libdir/ip4r', 'gip4r_union';


--
-- Name: ip4(double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4(double precision) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_cast_from_double';


--
-- Name: ip4(inet); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4(inet) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_cast_from_inet';


--
-- Name: ip4(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4(bigint) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_cast_from_bigint';


--
-- Name: ip4(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4(text) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_cast_from_text';


--
-- Name: ip4_and(ip4, ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_and(ip4, ip4) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_and';


--
-- Name: ip4_cmp(ip4, ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_cmp(ip4, ip4) RETURNS integer
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_cmp';


--
-- Name: ip4_contained_by(ip4, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_contained_by(ip4, ip4r) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_contained_by';


--
-- Name: ip4_contains(ip4r, ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_contains(ip4r, ip4) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_contains';


--
-- Name: ip4_eq(ip4, ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_eq(ip4, ip4) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_eq';


--
-- Name: ip4_ge(ip4, ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_ge(ip4, ip4) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_ge';


--
-- Name: ip4_gt(ip4, ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_gt(ip4, ip4) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_gt';


--
-- Name: ip4_le(ip4, ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_le(ip4, ip4) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_le';


--
-- Name: ip4_lt(ip4, ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_lt(ip4, ip4) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_lt';


--
-- Name: ip4_minus_bigint(ip4, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_minus_bigint(ip4, bigint) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_minus_bigint';


--
-- Name: ip4_minus_int(ip4, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_minus_int(ip4, integer) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_minus_int';


--
-- Name: ip4_minus_ip4(ip4, ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_minus_ip4(ip4, ip4) RETURNS bigint
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_minus_ip4';


--
-- Name: ip4_neq(ip4, ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_neq(ip4, ip4) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_neq';


--
-- Name: ip4_net_lower(ip4, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_net_lower(ip4, integer) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_net_lower';


--
-- Name: ip4_net_upper(ip4, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_net_upper(ip4, integer) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_net_upper';


--
-- Name: ip4_netmask(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_netmask(integer) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_netmask';


--
-- Name: ip4_not(ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_not(ip4) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_not';


--
-- Name: ip4_or(ip4, ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_or(ip4, ip4) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_or';


--
-- Name: ip4_plus_bigint(ip4, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_plus_bigint(ip4, bigint) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_plus_bigint';


--
-- Name: ip4_plus_int(ip4, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_plus_int(ip4, integer) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_plus_int';


--
-- Name: ip4_valid(_unchecked_dns_name); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_valid(_unchecked_dns_name) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/mastodon', 'ip4_valid_udf';


--
-- Name: ip4_xor(ip4, ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4_xor(ip4, ip4) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_xor';


--
-- Name: ip4hash(ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4hash(ip4) RETURNS integer
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4hash';


--
-- Name: ip4r(cidr); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r(cidr) RETURNS ip4r
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_cast_from_cidr';


--
-- Name: ip4r(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r(text) RETURNS ip4r
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_cast_from_text';


--
-- Name: ip4r(ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r(ip4) RETURNS ip4r
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_cast_from_ip4';


--
-- Name: ip4r(ip4, ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r(ip4, ip4) RETURNS ip4r
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_from_ip4s';


--
-- Name: ip4r_cmp(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_cmp(ip4r, ip4r) RETURNS integer
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_cmp';


--
-- Name: ip4r_contained_by(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_contained_by(ip4r, ip4r) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_contained_by';


--
-- Name: ip4r_contained_by_strict(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_contained_by_strict(ip4r, ip4r) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_contained_by_strict';


--
-- Name: ip4r_contains(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_contains(ip4r, ip4r) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_contains';


--
-- Name: ip4r_contains_strict(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_contains_strict(ip4r, ip4r) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_contains_strict';


--
-- Name: ip4r_eq(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_eq(ip4r, ip4r) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_eq';


--
-- Name: ip4r_ge(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_ge(ip4r, ip4r) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_ge';


--
-- Name: ip4r_gt(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_gt(ip4r, ip4r) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_gt';


--
-- Name: ip4r_inter(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_inter(ip4r, ip4r) RETURNS ip4r
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_inter';


--
-- Name: ip4r_le(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_le(ip4r, ip4r) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_le';


--
-- Name: ip4r_left_of(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_left_of(ip4r, ip4r) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_left_of';


--
-- Name: ip4r_left_overlap(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_left_overlap(ip4r, ip4r) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_left_overlap';


--
-- Name: ip4r_lt(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_lt(ip4r, ip4r) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_lt';


--
-- Name: ip4r_neq(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_neq(ip4r, ip4r) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_neq';


--
-- Name: ip4r_net_mask(ip4, ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_net_mask(ip4, ip4) RETURNS ip4r
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_net_mask';


--
-- Name: ip4r_net_prefix(ip4, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_net_prefix(ip4, integer) RETURNS ip4r
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_net_prefix';


--
-- Name: ip4r_overlaps(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_overlaps(ip4r, ip4r) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_overlaps';


--
-- Name: ip4r_right_of(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_right_of(ip4r, ip4r) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_right_of';


--
-- Name: ip4r_right_overlap(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_right_overlap(ip4r, ip4r) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_right_overlap';


--
-- Name: ip4r_size(ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_size(ip4r) RETURNS double precision
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_size';


--
-- Name: ip4r_union(ip4r, ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4r_union(ip4r, ip4r) RETURNS ip4r
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_union';


--
-- Name: ip4rhash(ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION ip4rhash(ip4r) RETURNS integer
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4rhash';


--
-- Name: is_cidr(ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION is_cidr(ip4r) RETURNS boolean
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_is_cidr';


--
-- Name: lower(ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION lower(ip4r) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_lower';


--
-- Name: norm_dns_name(_unchecked_dns_name); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION norm_dns_name(_unchecked_dns_name) RETURNS _dns_name
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/mastodon', 'norm_dns_name_udf';


--
-- Name: norm_url(_unchecked_url); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION norm_url(_unchecked_url) RETURNS _url
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/mastodon', 'norm_url_udf';


--
-- Name: rid_from_username(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION rid_from_username(character varying) RETURNS integer
    LANGUAGE sql
    AS $_$
    SELECT rid FROM registrations WHERE iid =
        (SELECT iid FROM identities WHERE lower(username) = lower($1))
$_$;


--
-- Name: text(ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION text(ip4) RETURNS text
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_cast_to_text';


--
-- Name: text(ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION text(ip4r) RETURNS text
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_cast_to_text';


--
-- Name: to_bigint(ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION to_bigint(ip4) RETURNS bigint
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_cast_to_bigint';


--
-- Name: to_double(ip4); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION to_double(ip4) RETURNS double precision
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4_cast_to_double';


--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
NEW.modified = now();
return NEW;
END;
$$;


--
-- Name: upper(ip4r); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION upper(ip4r) RETURNS ip4
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/ip4r', 'ip4r_upper';


--
-- Name: url_host(_url); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION url_host(_url) RETURNS _dns_name
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/mastodon', 'url_host_udf';


--
-- Name: url_pass(_url); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION url_pass(_url) RETURNS text
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/mastodon', 'url_pass_udf';


--
-- Name: url_path(_url); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION url_path(_url) RETURNS text
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/mastodon', 'url_path_udf';


--
-- Name: url_port(_url); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION url_port(_url) RETURNS integer
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/mastodon', 'url_port_udf';


--
-- Name: url_scheme(_url); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION url_scheme(_url) RETURNS text
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/mastodon', 'url_scheme_udf';


--
-- Name: url_user(_url); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION url_user(_url) RETURNS text
    LANGUAGE c IMMUTABLE STRICT
    AS '$libdir/mastodon', 'url_user_udf';


--
-- Name: #; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR # (
    PROCEDURE = ip4_xor,
    LEFTARG = ip4,
    RIGHTARG = ip4
);


--
-- Name: &; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR & (
    PROCEDURE = ip4_and,
    LEFTARG = ip4,
    RIGHTARG = ip4
);


--
-- Name: &&; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR && (
    PROCEDURE = ip4r_overlaps,
    LEFTARG = ip4r,
    RIGHTARG = ip4r,
    COMMUTATOR = &&,
    RESTRICT = areasel,
    JOIN = areajoinsel
);


--
-- Name: &<<; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR &<< (
    PROCEDURE = ip4r_left_overlap,
    LEFTARG = ip4r,
    RIGHTARG = ip4r,
    RESTRICT = positionsel,
    JOIN = positionjoinsel
);


--
-- Name: &>>; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR &>> (
    PROCEDURE = ip4r_right_overlap,
    LEFTARG = ip4r,
    RIGHTARG = ip4r,
    RESTRICT = positionsel,
    JOIN = positionjoinsel
);


--
-- Name: +; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR + (
    PROCEDURE = ip4_plus_int,
    LEFTARG = ip4,
    RIGHTARG = integer
);


--
-- Name: +; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR + (
    PROCEDURE = ip4_plus_bigint,
    LEFTARG = ip4,
    RIGHTARG = bigint
);


--
-- Name: -; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR - (
    PROCEDURE = ip4_minus_int,
    LEFTARG = ip4,
    RIGHTARG = integer
);


--
-- Name: -; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR - (
    PROCEDURE = ip4_minus_bigint,
    LEFTARG = ip4,
    RIGHTARG = bigint
);


--
-- Name: -; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR - (
    PROCEDURE = ip4_minus_ip4,
    LEFTARG = ip4,
    RIGHTARG = ip4
);


--
-- Name: <; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR < (
    PROCEDURE = ip4_lt,
    LEFTARG = ip4,
    RIGHTARG = ip4,
    COMMUTATOR = >,
    NEGATOR = >=,
    RESTRICT = scalarltsel,
    JOIN = scalarltjoinsel
);


--
-- Name: <; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR < (
    PROCEDURE = ip4r_lt,
    LEFTARG = ip4r,
    RIGHTARG = ip4r,
    COMMUTATOR = >,
    NEGATOR = >=,
    RESTRICT = scalarltsel,
    JOIN = scalarltjoinsel
);


--
-- Name: <<; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR << (
    PROCEDURE = ip4r_contained_by_strict,
    LEFTARG = ip4r,
    RIGHTARG = ip4r,
    COMMUTATOR = >>,
    RESTRICT = contsel,
    JOIN = contjoinsel
);


--
-- Name: <<<; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR <<< (
    PROCEDURE = ip4r_left_of,
    LEFTARG = ip4r,
    RIGHTARG = ip4r,
    COMMUTATOR = >>>,
    RESTRICT = positionsel,
    JOIN = positionjoinsel
);


--
-- Name: <<=; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR <<= (
    PROCEDURE = ip4r_contained_by,
    LEFTARG = ip4r,
    RIGHTARG = ip4r,
    COMMUTATOR = >>=,
    RESTRICT = contsel,
    JOIN = contjoinsel
);


--
-- Name: <=; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR <= (
    PROCEDURE = ip4_le,
    LEFTARG = ip4,
    RIGHTARG = ip4,
    COMMUTATOR = >=,
    NEGATOR = >,
    RESTRICT = scalarltsel,
    JOIN = scalarltjoinsel
);


--
-- Name: <=; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR <= (
    PROCEDURE = ip4r_le,
    LEFTARG = ip4r,
    RIGHTARG = ip4r,
    COMMUTATOR = >=,
    NEGATOR = >,
    RESTRICT = scalarltsel,
    JOIN = scalarltjoinsel
);


--
-- Name: <>; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR <> (
    PROCEDURE = ip4_neq,
    LEFTARG = ip4,
    RIGHTARG = ip4,
    COMMUTATOR = <>,
    NEGATOR = =,
    RESTRICT = neqsel,
    JOIN = neqjoinsel
);


--
-- Name: <>; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR <> (
    PROCEDURE = ip4r_neq,
    LEFTARG = ip4r,
    RIGHTARG = ip4r,
    COMMUTATOR = <>,
    NEGATOR = =,
    RESTRICT = neqsel,
    JOIN = neqjoinsel
);


--
-- Name: =; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR = (
    PROCEDURE = ip4_eq,
    LEFTARG = ip4,
    RIGHTARG = ip4,
    COMMUTATOR = =,
    NEGATOR = <>,
    MERGES,
    HASHES,
    RESTRICT = eqsel,
    JOIN = eqjoinsel
);


--
-- Name: =; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR = (
    PROCEDURE = ip4r_eq,
    LEFTARG = ip4r,
    RIGHTARG = ip4r,
    COMMUTATOR = =,
    NEGATOR = <>,
    MERGES,
    HASHES,
    RESTRICT = eqsel,
    JOIN = eqjoinsel
);


--
-- Name: >; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR > (
    PROCEDURE = ip4_gt,
    LEFTARG = ip4,
    RIGHTARG = ip4,
    COMMUTATOR = <,
    NEGATOR = <=,
    RESTRICT = scalargtsel,
    JOIN = scalargtjoinsel
);


--
-- Name: >; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR > (
    PROCEDURE = ip4r_gt,
    LEFTARG = ip4r,
    RIGHTARG = ip4r,
    COMMUTATOR = <,
    NEGATOR = <=,
    RESTRICT = scalargtsel,
    JOIN = scalargtjoinsel
);


--
-- Name: >=; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR >= (
    PROCEDURE = ip4_ge,
    LEFTARG = ip4,
    RIGHTARG = ip4,
    COMMUTATOR = <=,
    NEGATOR = <,
    RESTRICT = scalargtsel,
    JOIN = scalargtjoinsel
);


--
-- Name: >=; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR >= (
    PROCEDURE = ip4r_ge,
    LEFTARG = ip4r,
    RIGHTARG = ip4r,
    COMMUTATOR = <=,
    NEGATOR = <,
    RESTRICT = scalargtsel,
    JOIN = scalargtjoinsel
);


--
-- Name: >>; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR >> (
    PROCEDURE = ip4r_contains_strict,
    LEFTARG = ip4r,
    RIGHTARG = ip4r,
    COMMUTATOR = <<,
    RESTRICT = contsel,
    JOIN = contjoinsel
);


--
-- Name: >>=; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR >>= (
    PROCEDURE = ip4r_contains,
    LEFTARG = ip4r,
    RIGHTARG = ip4r,
    COMMUTATOR = <<=,
    RESTRICT = contsel,
    JOIN = contjoinsel
);


--
-- Name: >>>; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR >>> (
    PROCEDURE = ip4r_right_of,
    LEFTARG = ip4r,
    RIGHTARG = ip4r,
    COMMUTATOR = <<<,
    RESTRICT = positionsel,
    JOIN = positionjoinsel
);


--
-- Name: @; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR @ (
    PROCEDURE = ip4r_contains,
    LEFTARG = ip4r,
    RIGHTARG = ip4r,
    COMMUTATOR = ~,
    RESTRICT = contsel,
    JOIN = contjoinsel
);


--
-- Name: |; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR | (
    PROCEDURE = ip4_or,
    LEFTARG = ip4,
    RIGHTARG = ip4
);


--
-- Name: ~; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR ~ (
    PROCEDURE = ip4_not,
    RIGHTARG = ip4
);


--
-- Name: ~; Type: OPERATOR; Schema: public; Owner: -
--

CREATE OPERATOR ~ (
    PROCEDURE = ip4r_contained_by,
    LEFTARG = ip4r,
    RIGHTARG = ip4r,
    COMMUTATOR = @,
    RESTRICT = contsel,
    JOIN = contjoinsel
);


--
-- Name: btree_ip4_ops; Type: OPERATOR FAMILY; Schema: public; Owner: -
--

CREATE OPERATOR FAMILY btree_ip4_ops USING btree;


--
-- Name: btree_ip4_ops; Type: OPERATOR CLASS; Schema: public; Owner: -
--

CREATE OPERATOR CLASS btree_ip4_ops
    DEFAULT FOR TYPE ip4 USING btree FAMILY btree_ip4_ops AS
    OPERATOR 1 <(ip4,ip4) ,
    OPERATOR 2 <=(ip4,ip4) ,
    OPERATOR 3 =(ip4,ip4) ,
    OPERATOR 4 >=(ip4,ip4) ,
    OPERATOR 5 >(ip4,ip4) ,
    FUNCTION 1 (ip4, ip4) ip4_cmp(ip4,ip4);


--
-- Name: btree_ip4r_ops; Type: OPERATOR FAMILY; Schema: public; Owner: -
--

CREATE OPERATOR FAMILY btree_ip4r_ops USING btree;


--
-- Name: btree_ip4r_ops; Type: OPERATOR CLASS; Schema: public; Owner: -
--

CREATE OPERATOR CLASS btree_ip4r_ops
    DEFAULT FOR TYPE ip4r USING btree FAMILY btree_ip4r_ops AS
    OPERATOR 1 <(ip4r,ip4r) ,
    OPERATOR 2 <=(ip4r,ip4r) ,
    OPERATOR 3 =(ip4r,ip4r) ,
    OPERATOR 4 >=(ip4r,ip4r) ,
    OPERATOR 5 >(ip4r,ip4r) ,
    FUNCTION 1 (ip4r, ip4r) ip4r_cmp(ip4r,ip4r);


--
-- Name: gist_ip4r_ops; Type: OPERATOR FAMILY; Schema: public; Owner: -
--

CREATE OPERATOR FAMILY gist_ip4r_ops USING gist;


--
-- Name: gist_ip4r_ops; Type: OPERATOR CLASS; Schema: public; Owner: -
--

CREATE OPERATOR CLASS gist_ip4r_ops
    DEFAULT FOR TYPE ip4r USING gist FAMILY gist_ip4r_ops AS
    OPERATOR 1 >>=(ip4r,ip4r) ,
    OPERATOR 2 <<=(ip4r,ip4r) ,
    OPERATOR 3 >>(ip4r,ip4r) ,
    OPERATOR 4 <<(ip4r,ip4r) ,
    OPERATOR 5 &&(ip4r,ip4r) ,
    OPERATOR 6 =(ip4r,ip4r) ,
    FUNCTION 1 (ip4r, ip4r) gip4r_consistent(internal,ip4r,integer) ,
    FUNCTION 2 (ip4r, ip4r) gip4r_union(internal,internal) ,
    FUNCTION 3 (ip4r, ip4r) gip4r_compress(internal) ,
    FUNCTION 4 (ip4r, ip4r) gip4r_decompress(internal) ,
    FUNCTION 5 (ip4r, ip4r) gip4r_penalty(internal,internal,internal) ,
    FUNCTION 6 (ip4r, ip4r) gip4r_picksplit(internal,internal) ,
    FUNCTION 7 (ip4r, ip4r) gip4r_same(ip4r,ip4r,internal);


--
-- Name: hash_ip4_ops; Type: OPERATOR FAMILY; Schema: public; Owner: -
--

CREATE OPERATOR FAMILY hash_ip4_ops USING hash;


--
-- Name: hash_ip4_ops; Type: OPERATOR CLASS; Schema: public; Owner: -
--

CREATE OPERATOR CLASS hash_ip4_ops
    DEFAULT FOR TYPE ip4 USING hash FAMILY hash_ip4_ops AS
    OPERATOR 1 =(ip4,ip4) ,
    FUNCTION 1 (ip4, ip4) ip4hash(ip4);


--
-- Name: hash_ip4r_ops; Type: OPERATOR FAMILY; Schema: public; Owner: -
--

CREATE OPERATOR FAMILY hash_ip4r_ops USING hash;


--
-- Name: hash_ip4r_ops; Type: OPERATOR CLASS; Schema: public; Owner: -
--

CREATE OPERATOR CLASS hash_ip4r_ops
    DEFAULT FOR TYPE ip4r USING hash FAMILY hash_ip4r_ops AS
    OPERATOR 1 =(ip4r,ip4r) ,
    FUNCTION 1 (ip4r, ip4r) ip4rhash(ip4r);


SET search_path = pg_catalog;

--
-- Name: CAST (cidr AS public.ip4r); Type: CAST; Schema: pg_catalog; Owner: -
--

CREATE CAST (cidr AS public.ip4r) WITH FUNCTION public.ip4r(cidr) AS ASSIGNMENT;


--
-- Name: CAST (double precision AS public.ip4); Type: CAST; Schema: pg_catalog; Owner: -
--

CREATE CAST (double precision AS public.ip4) WITH FUNCTION public.ip4(double precision);


--
-- Name: CAST (inet AS public.ip4); Type: CAST; Schema: pg_catalog; Owner: -
--

CREATE CAST (inet AS public.ip4) WITH FUNCTION public.ip4(inet) AS ASSIGNMENT;


--
-- Name: CAST (bigint AS public.ip4); Type: CAST; Schema: pg_catalog; Owner: -
--

CREATE CAST (bigint AS public.ip4) WITH FUNCTION public.ip4(bigint);


--
-- Name: CAST (public.ip4 AS cidr); Type: CAST; Schema: pg_catalog; Owner: -
--

CREATE CAST (public.ip4 AS cidr) WITH FUNCTION public.cidr(public.ip4) AS ASSIGNMENT;


--
-- Name: CAST (public.ip4 AS double precision); Type: CAST; Schema: pg_catalog; Owner: -
--

CREATE CAST (public.ip4 AS double precision) WITH FUNCTION public.to_double(public.ip4);


--
-- Name: CAST (public.ip4 AS bigint); Type: CAST; Schema: pg_catalog; Owner: -
--

CREATE CAST (public.ip4 AS bigint) WITH FUNCTION public.to_bigint(public.ip4);


--
-- Name: CAST (public.ip4 AS public.ip4r); Type: CAST; Schema: pg_catalog; Owner: -
--

CREATE CAST (public.ip4 AS public.ip4r) WITH FUNCTION public.ip4r(public.ip4) AS IMPLICIT;


--
-- Name: CAST (public.ip4 AS text); Type: CAST; Schema: pg_catalog; Owner: -
--

CREATE CAST (public.ip4 AS text) WITH FUNCTION public.text(public.ip4);


--
-- Name: CAST (public.ip4r AS cidr); Type: CAST; Schema: pg_catalog; Owner: -
--

CREATE CAST (public.ip4r AS cidr) WITH FUNCTION public.cidr(public.ip4r);


--
-- Name: CAST (public.ip4r AS text); Type: CAST; Schema: pg_catalog; Owner: -
--

CREATE CAST (public.ip4r AS text) WITH FUNCTION public.text(public.ip4r);


--
-- Name: CAST (text AS public.ip4); Type: CAST; Schema: pg_catalog; Owner: -
--

CREATE CAST (text AS public.ip4) WITH FUNCTION public.ip4(text);


--
-- Name: CAST (text AS public.ip4r); Type: CAST; Schema: pg_catalog; Owner: -
--

CREATE CAST (text AS public.ip4r) WITH FUNCTION public.ip4r(text);


SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: account_accesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE account_accesses (
    "timestamp" timestamp without time zone NOT NULL,
    iid integer NOT NULL,
    ip character varying NOT NULL,
    method character varying NOT NULL,
    improper_format boolean DEFAULT false,
    id integer NOT NULL,
    probable_duplicate boolean DEFAULT false,
    source integer
);


--
-- Name: account_accesses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE account_accesses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_accesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE account_accesses_id_seq OWNED BY account_accesses.id;


--
-- Name: account_accesses_pre1608data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE account_accesses_pre1608data (
    "timestamp" timestamp without time zone,
    iid integer,
    ip character varying,
    method character varying,
    improper_format boolean,
    id integer NOT NULL,
    probable_duplicate boolean,
    source integer
);


--
-- Name: domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE domains (
    did integer NOT NULL,
    domain_name character varying NOT NULL
);


--
-- Name: domains_did_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE domains_did_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: domains_did_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE domains_did_seq OWNED BY domains.did;


--
-- Name: error_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE error_codes (
    errno integer NOT NULL,
    text_name character varying,
    comment character varying
);


--
-- Name: identities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE identities (
    iid integer NOT NULL,
    firstname character varying(80),
    lastname character varying(80),
    email character varying(200),
    password character varying(64),
    username character varying(64),
    address character varying(80),
    city character varying(30),
    state character(2),
    zip character varying(10),
    gender gender,
    dob date,
    phone character(10),
    middleinitial character(1),
    title character varying,
    company character varying,
    mothersmaiden character varying,
    used boolean DEFAULT false,
    "group" character varying DEFAULT 'none'::character varying,
    type character varying,
    enabled boolean DEFAULT false,
    in_use boolean DEFAULT false,
    verified boolean DEFAULT false,
    not_created boolean DEFAULT false,
    in_use_by integer
);


--
-- Name: identities_iid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE identities_iid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: identities_iid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE identities_iid_seq OWNED BY identities.iid;


--
-- Name: status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE status (
    oid integer NOT NULL,
    alexa integer,
    errno integer,
    "time" timestamp without time zone DEFAULT now(),
    iid integer,
    rid integer,
    sid integer,
    checkpoint integer,
    last_status character varying,
    ignore boolean DEFAULT false,
    gid integer,
    qid integer,
    vid integer,
    queue character varying,
    did integer
);


--
-- Name: labeled_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW labeled_status AS
SELECT status.oid, status.alexa, status.errno, status."time", status.iid, status.rid, status.sid, status.checkpoint, status.last_status, status.ignore, status.gid, status.qid, status.vid, status.queue, status.did, (row_number() OVER (PARTITION BY status.did ORDER BY status.oid) = 1) AS first, (row_number() OVER (PARTITION BY status.did ORDER BY status.oid DESC) = 1) AS last FROM status WHERE (((status.qid IS NOT NULL) AND (status."time" > '2014-12-01 00:00:00'::timestamp without time zone)) AND (status."time" < '2016-01-01 00:00:00'::timestamp without time zone));


--
-- Name: paper_account_aliases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE paper_account_aliases (
    id integer NOT NULL,
    iid integer,
    account_alias character varying,
    shutdown integer
);


--
-- Name: paper_domain_aliases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE paper_domain_aliases (
    id integer NOT NULL,
    did integer,
    domain_alias character varying
);


--
-- Name: registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE registrations (
    rid integer NOT NULL,
    regtime timestamp without time zone DEFAULT now(),
    iid integer,
    probably_bad boolean DEFAULT false,
    status character varying,
    verified boolean DEFAULT false,
    wrong_email boolean DEFAULT false,
    definitely_failed boolean DEFAULT false,
    fail_reason character varying,
    vid integer,
    did integer
);


--
-- Name: url_id_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE url_id_assignments (
    iid integer,
    batch character varying,
    type character varying,
    did integer
);


--
-- Name: login_info; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW login_info AS
SELECT a."timestamp", a.iid, aa.account_alias, a.ip, a.method, u.batch, u.type, d.domain_name, da.domain_alias, d.did, min((r.status)::text) AS a_reg_status, min(r.regtime) AS a_reg_time, count(DISTINCT r.rid) AS n_regs, a.improper_format, a.probable_duplicate, a.id FROM (((((account_accesses a JOIN url_id_assignments u ON ((u.iid = a.iid))) JOIN domains d ON ((d.did = u.did))) JOIN registrations r ON ((r.iid = a.iid))) LEFT JOIN paper_domain_aliases da ON ((d.did = da.did))) LEFT JOIN paper_account_aliases aa ON ((a.iid = aa.iid))) WHERE ((NOT r.definitely_failed) AND (NOT r.probably_bad)) GROUP BY a."timestamp", a.iid, a.ip, a.method, a.improper_format, a.probable_duplicate, a.id, u.batch, u.type, d.domain_name, d.did, aa.account_alias, da.domain_alias ORDER BY a.ip, a.iid;


--
-- Name: queues_qid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE queues_qid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: queues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE queues (
    qid integer DEFAULT nextval('queues_qid_seq'::regclass) NOT NULL,
    created timestamp without time zone DEFAULT now(),
    modified timestamp without time zone DEFAULT now(),
    alexa integer,
    try integer DEFAULT 0 NOT NULL,
    status character varying DEFAULT 'queued'::character varying NOT NULL,
    queue character varying DEFAULT 'default'::character varying NOT NULL,
    sid integer NOT NULL,
    id_type character varying NOT NULL,
    id_group character varying NOT NULL,
    vid integer,
    claimed_by integer,
    did integer NOT NULL
);


--
-- Name: login_info_v2; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW login_info_v2 AS
SELECT a."timestamp", a.iid, aa.account_alias, a.ip, a.method, u.batch, u.type, d.domain_name, da.domain_alias, d.did, min((r.status)::text) AS a_reg_status, min(r.regtime) AS a_reg_time, count(DISTINCT r.rid) AS n_regs, a.improper_format, a.probable_duplicate, a.id, min(q.alexa) AS alexa FROM ((((((account_accesses a JOIN url_id_assignments u ON ((u.iid = a.iid))) JOIN domains d ON ((d.did = u.did))) JOIN registrations r ON ((r.iid = a.iid))) LEFT JOIN paper_domain_aliases da ON ((d.did = da.did))) LEFT JOIN paper_account_aliases aa ON ((a.iid = aa.iid))) LEFT JOIN queues q ON ((q.did = d.did))) WHERE ((NOT r.definitely_failed) AND (NOT r.probably_bad)) GROUP BY a."timestamp", a.iid, a.ip, a.method, a.improper_format, a.probable_duplicate, a.id, u.batch, u.type, d.domain_name, d.did, aa.account_alias, da.domain_alias ORDER BY a.ip, a.iid;


--
-- Name: mail_rid_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW mail_rid_view AS
SELECT registrations.rid, identities.email FROM (registrations JOIN identities ON ((registrations.iid = identities.iid))) WHERE (registrations.regtime > (now() - '10 days'::interval));


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE messages (
    mid integer NOT NULL,
    rid integer,
    clicktime timestamp without time zone DEFAULT now(),
    clicklink character varying,
    path character varying,
    errno integer,
    message_path character varying,
    reclicked boolean DEFAULT false
);


--
-- Name: messages_mid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE messages_mid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_mid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE messages_mid_seq OWNED BY messages.mid;


--
-- Name: paper_account_aliases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE paper_account_aliases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: paper_account_aliases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE paper_account_aliases_id_seq OWNED BY paper_account_aliases.id;


--
-- Name: paper_domain_aliases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE paper_domain_aliases_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: paper_domain_aliases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE paper_domain_aliases_id_seq OWNED BY paper_domain_aliases.id;


--
-- Name: public_login_info_v1; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public_login_info_v1 AS
SELECT login_info_v2.account_alias, (date_trunc('day'::text, login_info_v2."timestamp"))::date AS date_trunc, CASE WHEN ((login_info_v2.ip)::text ~~ '%.%'::text) THEN (network((((login_info_v2.ip)::text || '/24'::text))::inet))::character varying ELSE login_info_v2.ip END AS net, (date_trunc('week'::text, login_info_v2.a_reg_time))::date AS a_reg_week, login_info_v2.a_reg_status, login_info_v2.n_regs, login_info_v2.improper_format, login_info_v2.probable_duplicate, ((login_info_v2.alexa / 500) * 500) AS approx_alexa FROM login_info_v2;


--
-- Name: queue_decision_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE queue_decision_log (
    qdlid integer NOT NULL,
    did integer,
    alexa integer,
    queue character varying,
    sid integer,
    id_type character varying,
    id_group character varying,
    vid integer,
    created timestamp without time zone DEFAULT now(),
    qid integer,
    decision character varying,
    pid integer
);


--
-- Name: queue_decision_log_qdlid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE queue_decision_log_qdlid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: queue_decision_log_qdlid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE queue_decision_log_qdlid_seq OWNED BY queue_decision_log.qdlid;


--
-- Name: queue_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE queue_versions (
    vid integer NOT NULL,
    description character varying,
    created timestamp without time zone DEFAULT now()
);


--
-- Name: queue_versions_vid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE queue_versions_vid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: queue_versions_vid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE queue_versions_vid_seq OWNED BY queue_versions.vid;


--
-- Name: registration_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW registration_status AS
SELECT domains.domain_name, registrations.did, registrations.iid, max(registrations.rid) AS recent_rid, (array_agg(registrations.status))[1] AS recent_status, array_agg(registrations.rid) AS rids, array_agg(registrations.status) AS statii, max((identities."group")::text) AS "group", identities.type FROM ((registrations JOIN identities ON ((registrations.iid = identities.iid))) JOIN domains ON ((registrations.did = domains.did))) WHERE (((NOT registrations.definitely_failed) AND (NOT registrations.probably_bad)) AND (NOT registrations.wrong_email)) GROUP BY registrations.did, identities.type, registrations.iid, domains.domain_name;


--
-- Name: registrations_rid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE registrations_rid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: registrations_rid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE registrations_rid_seq OWNED BY registrations.rid;


--
-- Name: status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE status_id_seq OWNED BY status.oid;


--
-- Name: strategies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE strategies (
    sid integer NOT NULL,
    finder_prompt_min_count integer DEFAULT (-1),
    filler_prompt_repair boolean DEFAULT false,
    filler_auto_fill boolean DEFAULT true,
    submit boolean DEFAULT true,
    name character varying NOT NULL,
    filler_captcha_fill boolean DEFAULT true
);


--
-- Name: strategies_sid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE strategies_sid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: strategies_sid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE strategies_sid_seq OWNED BY strategies.sid;


--
-- Name: tw_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE tw_domains (
    alexa integer NOT NULL,
    url character varying(255) NOT NULL,
    lang lang_class DEFAULT 'unknown'::lang_class,
    status crawl_status DEFAULT 'unknown'::crawl_status,
    selected boolean DEFAULT false,
    loaded boolean DEFAULT false,
    path character varying(255),
    found_reg boolean DEFAULT false,
    num_fields integer DEFAULT (-1),
    num_visible integer DEFAULT (-1),
    num_missed integer DEFAULT (-1)
);


--
-- Name: unprocessed_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE unprocessed_messages (
    umid integer NOT NULL,
    received timestamp without time zone DEFAULT now(),
    message text,
    iid integer,
    process_attempt integer DEFAULT 0,
    ignore_until timestamp without time zone DEFAULT '1970-01-01 00:00:00'::timestamp without time zone,
    disabled boolean DEFAULT false,
    message_path character varying
);


--
-- Name: unprocessed_messages_upid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE unprocessed_messages_upid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unprocessed_messages_upid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE unprocessed_messages_upid_seq OWNED BY unprocessed_messages.umid;


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY account_accesses ALTER COLUMN id SET DEFAULT nextval('account_accesses_id_seq'::regclass);


--
-- Name: did; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY domains ALTER COLUMN did SET DEFAULT nextval('domains_did_seq'::regclass);


--
-- Name: iid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY identities ALTER COLUMN iid SET DEFAULT nextval('identities_iid_seq'::regclass);


--
-- Name: mid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY messages ALTER COLUMN mid SET DEFAULT nextval('messages_mid_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY paper_account_aliases ALTER COLUMN id SET DEFAULT nextval('paper_account_aliases_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY paper_domain_aliases ALTER COLUMN id SET DEFAULT nextval('paper_domain_aliases_id_seq'::regclass);


--
-- Name: qdlid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY queue_decision_log ALTER COLUMN qdlid SET DEFAULT nextval('queue_decision_log_qdlid_seq'::regclass);


--
-- Name: vid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY queue_versions ALTER COLUMN vid SET DEFAULT nextval('queue_versions_vid_seq'::regclass);


--
-- Name: rid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY registrations ALTER COLUMN rid SET DEFAULT nextval('registrations_rid_seq'::regclass);


--
-- Name: oid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY status ALTER COLUMN oid SET DEFAULT nextval('status_id_seq'::regclass);


--
-- Name: sid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY strategies ALTER COLUMN sid SET DEFAULT nextval('strategies_sid_seq'::regclass);


--
-- Name: umid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY unprocessed_messages ALTER COLUMN umid SET DEFAULT nextval('unprocessed_messages_upid_seq'::regclass);


--
-- Name: account_accesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY account_accesses
    ADD CONSTRAINT account_accesses_pkey PRIMARY KEY ("timestamp", iid, ip, method);


--
-- Name: account_accesses_timestamp_iid_ip_method_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY account_accesses
    ADD CONSTRAINT account_accesses_timestamp_iid_ip_method_unique UNIQUE ("timestamp", iid, ip, method);


--
-- Name: all_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY error_codes
    ADD CONSTRAINT all_unique UNIQUE (text_name, comment);


--
-- Name: domains_did_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY domains
    ADD CONSTRAINT domains_did_key UNIQUE (did);


--
-- Name: domains_domain_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY domains
    ADD CONSTRAINT domains_domain_name_key UNIQUE (domain_name);


--
-- Name: error_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY error_codes
    ADD CONSTRAINT error_codes_pkey PRIMARY KEY (errno);


--
-- Name: identities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (iid);


--
-- Name: identities_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY identities
    ADD CONSTRAINT identities_username_key UNIQUE (username);


--
-- Name: messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (mid);


--
-- Name: queue_decision_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY queue_decision_log
    ADD CONSTRAINT queue_decision_log_pkey PRIMARY KEY (qdlid);


--
-- Name: queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY queues
    ADD CONSTRAINT queue_pkey PRIMARY KEY (qid);


--
-- Name: queue_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY queue_versions
    ADD CONSTRAINT queue_versions_pkey PRIMARY KEY (vid);


--
-- Name: registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY registrations
    ADD CONSTRAINT registrations_pkey PRIMARY KEY (rid);


--
-- Name: status_global_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY status
    ADD CONSTRAINT status_global_id_key UNIQUE (gid);


--
-- Name: strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY strategies
    ADD CONSTRAINT strategies_pkey PRIMARY KEY (sid);


--
-- Name: tw_domains_alexa_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY tw_domains
    ADD CONSTRAINT tw_domains_alexa_key UNIQUE (alexa);


--
-- Name: tw_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY tw_domains
    ADD CONSTRAINT tw_domains_pkey PRIMARY KEY (url);


--
-- Name: unique_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY strategies
    ADD CONSTRAINT unique_name UNIQUE (name);


--
-- Name: url_id_assignments_iid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY url_id_assignments
    ADD CONSTRAINT url_id_assignments_iid_key UNIQUE (iid);


--
-- Name: strategies_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX strategies_name_idx ON strategies USING btree (name);


--
-- Name: update_queue_modified; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_queue_modified BEFORE UPDATE ON queues FOR EACH ROW EXECUTE PROCEDURE update_modified_column();


--
-- Name: messages_rid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY messages
    ADD CONSTRAINT messages_rid_fkey FOREIGN KEY (rid) REFERENCES registrations(rid);


--
-- Name: queue_decision_log_did_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY queue_decision_log
    ADD CONSTRAINT queue_decision_log_did_fkey FOREIGN KEY (did) REFERENCES domains(did);


--
-- Name: queue_decision_log_sid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY queue_decision_log
    ADD CONSTRAINT queue_decision_log_sid_fkey FOREIGN KEY (sid) REFERENCES strategies(sid);


--
-- Name: queue_decision_log_vid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY queue_decision_log
    ADD CONSTRAINT queue_decision_log_vid_fkey FOREIGN KEY (vid) REFERENCES queue_versions(vid);


--
-- Name: queues_did_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY queues
    ADD CONSTRAINT queues_did_fkey FOREIGN KEY (did) REFERENCES domains(did);


--
-- Name: queues_vid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY queues
    ADD CONSTRAINT queues_vid_fkey FOREIGN KEY (vid) REFERENCES queue_versions(vid);


--
-- Name: registrations_did_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY registrations
    ADD CONSTRAINT registrations_did_fkey FOREIGN KEY (did) REFERENCES domains(did);


--
-- Name: registrations_iid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY registrations
    ADD CONSTRAINT registrations_iid_fkey FOREIGN KEY (iid) REFERENCES identities(iid);


--
-- Name: registrations_vid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY registrations
    ADD CONSTRAINT registrations_vid_fkey FOREIGN KEY (vid) REFERENCES queue_versions(vid);


--
-- Name: status_did_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY status
    ADD CONSTRAINT status_did_fkey FOREIGN KEY (did) REFERENCES domains(did);


--
-- Name: status_vid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY status
    ADD CONSTRAINT status_vid_fkey FOREIGN KEY (vid) REFERENCES queue_versions(vid);


--
-- Name: url_id_assignments_did_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY url_id_assignments
    ADD CONSTRAINT url_id_assignments_did_fkey FOREIGN KEY (did) REFERENCES domains(did);


--
-- PostgreSQL database dump complete
--

