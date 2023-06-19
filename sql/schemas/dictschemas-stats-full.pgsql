--
-- PostgreSQL database dump
--

-- Dumped from database version 12.1
-- Dumped by pg_dump version 12.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: stats; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA stats;


ALTER SCHEMA stats OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: entry_hits; Type: TABLE; Schema: stats; Owner: postgres
--

CREATE TABLE stats.entry_hits (
    id integer NOT NULL,
    entry_id integer NOT NULL,
    requested_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE stats.entry_hits OWNER TO postgres;

--
-- Name: entry_hits_id_seq; Type: SEQUENCE; Schema: stats; Owner: postgres
--

CREATE SEQUENCE stats.entry_hits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE stats.entry_hits_id_seq OWNER TO postgres;

--
-- Name: entry_hits_id_seq; Type: SEQUENCE OWNED BY; Schema: stats; Owner: postgres
--

ALTER SEQUENCE stats.entry_hits_id_seq OWNED BY stats.entry_hits.id;


--
-- Name: missing; Type: TABLE; Schema: stats; Owner: postgres
--

CREATE TABLE stats.missing (
    id integer NOT NULL,
    slug text NOT NULL,
    hits integer DEFAULT 1 NOT NULL,
    first_hit_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp with time zone,
    resolved_by integer,
    ignore boolean DEFAULT false
);


ALTER TABLE stats.missing OWNER TO postgres;

--
-- Name: missing_id_seq; Type: SEQUENCE; Schema: stats; Owner: postgres
--

CREATE SEQUENCE stats.missing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE stats.missing_id_seq OWNER TO postgres;

--
-- Name: missing_id_seq; Type: SEQUENCE OWNED BY; Schema: stats; Owner: postgres
--

ALTER SEQUENCE stats.missing_id_seq OWNED BY stats.missing.id;


--
-- Name: entry_hits id; Type: DEFAULT; Schema: stats; Owner: postgres
--

ALTER TABLE ONLY stats.entry_hits ALTER COLUMN id SET DEFAULT nextval('stats.entry_hits_id_seq'::regclass);


--
-- Name: missing id; Type: DEFAULT; Schema: stats; Owner: postgres
--

ALTER TABLE ONLY stats.missing ALTER COLUMN id SET DEFAULT nextval('stats.missing_id_seq'::regclass);


--
-- Data for Name: entry_hits; Type: TABLE DATA; Schema: stats; Owner: postgres
--

COPY stats.entry_hits (id, entry_id, requested_at) FROM stdin;
\.


--
-- Data for Name: missing; Type: TABLE DATA; Schema: stats; Owner: postgres
--

COPY stats.missing (id, slug, hits, first_hit_at, resolved_at, resolved_by, ignore) FROM stdin;
\.


--
-- Name: entry_hits_id_seq; Type: SEQUENCE SET; Schema: stats; Owner: postgres
--

SELECT pg_catalog.setval('stats.entry_hits_id_seq', 1, false);


--
-- Name: missing_id_seq; Type: SEQUENCE SET; Schema: stats; Owner: postgres
--

SELECT pg_catalog.setval('stats.missing_id_seq', 1, false);


--
-- Name: entry_hits entry_hits_pkey; Type: CONSTRAINT; Schema: stats; Owner: postgres
--

ALTER TABLE ONLY stats.entry_hits
    ADD CONSTRAINT entry_hits_pkey PRIMARY KEY (id);


--
-- Name: missing missing_pkey; Type: CONSTRAINT; Schema: stats; Owner: postgres
--

ALTER TABLE ONLY stats.missing
    ADD CONSTRAINT missing_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

