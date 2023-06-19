TRUNCATE TABLE dict.grammar_restriction_frequencies RESTART IDENTITY;

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
-- Data for Name: grammar_restriction_frequencies; Type: TABLE DATA; Schema: dict; Owner: postgres
--

INSERT INTO dict.grammar_restriction_frequencies (id, name, caption, compare_value) VALUES (1, 'rare', 'Reti', 1);
INSERT INTO dict.grammar_restriction_frequencies (id, name, caption, compare_value) VALUES (2, 'halfRare', 'Pareti', 2);
INSERT INTO dict.grammar_restriction_frequencies (id, name, caption, compare_value) VALUES (3, 'often', 'Bieži', 3);
INSERT INTO dict.grammar_restriction_frequencies (id, name, caption, compare_value) VALUES (4, 'usually', 'Parasti', 4);
INSERT INTO dict.grammar_restriction_frequencies (id, name, caption, compare_value) VALUES (5, 'only', 'Tikai', 5);
INSERT INTO dict.grammar_restriction_frequencies (id, name, caption, compare_value) VALUES (6, 'also', 'Arī', -1);
INSERT INTO dict.grammar_restriction_frequencies (id, name, caption, compare_value) VALUES (7, 'rarer', 'Retāk', -2);
INSERT INTO dict.grammar_restriction_frequencies (id, name, caption, compare_value) VALUES (8, 'undisclosed', NULL, 6);


--
-- Name: grammar_restriction_frequencies_id_seq; Type: SEQUENCE SET; Schema: dict; Owner: postgres
--

SELECT pg_catalog.setval('dict.grammar_restriction_frequencies_id_seq', 8, true);


--
-- PostgreSQL database dump complete
--

