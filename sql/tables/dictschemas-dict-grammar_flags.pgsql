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
-- Data for Name: grammar_flags; Type: TABLE DATA; Schema: dict; Owner: postgres
--

INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (6, 'Joma', NULL, NULL, false, true, 'E', 'ESL', 2);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (24, 'Piezīmes', NULL, NULL, false, false, 'F', 'ESL', 21);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (60, 'Vārdšķira', NULL, NULL, false, false, 'E', 'L', 43);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (17, 'Lietojums', NULL, NULL, false, true, 'E', 'ESL', 15);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (59, 'Teikuma komunikatīvais tips', NULL, NULL, false, true, 'E', 'R', 42);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (58, 'Sintaktisks ierobežojums', NULL, NULL, false, true, 'E', 'R', 41);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (3, 'Dialekta iezīmes', NULL, NULL, false, false, 'E', 'ESL', 19);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (27, 'Stils', NULL, NULL, false, true, 'E', 'ESL', 17);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (18, 'Locīt kā', NULL, NULL, true, true, 'F', 'L', 6);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (8, 'Konjugācija', NULL, NULL, false, false, 'E', 'L', 14);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (52, 'Kategorija (vārda daļai)', NULL, NULL, false, true, 'E', 'L', 37);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (48, 'Saikļa tips', NULL, NULL, false, false, 'E', 'SL', 33);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (25, 'Priedēklis', NULL, NULL, false, false, 'E', 'L', 8);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (19, 'Locīšanas īpatnības', NULL, NULL, false, true, 'E', 'L', 7);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (20, 'Novietojums', NULL, NULL, false, false, 'E', 'SLR', 16);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (61, 'Noliegums', NULL, NULL, false, false, 'E', 'R', 45);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (31, 'Šķirkļavārda īpatnības', NULL, NULL, false, false, 'E', 'L', 12);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (39, 'Pakāpe', NULL, NULL, false, false, 'E', 'LR', 25);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (40, 'Noteiktība', NULL, NULL, true, false, 'E', 'R', 29);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (41, 'Persona', NULL, NULL, false, false, 'E', 'R', 26);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (43, 'Priedēkļa piemitība', NULL, NULL, false, false, 'E', 'R', 30);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (44, 'Laiks', NULL, NULL, false, false, 'E', 'R', 24);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (45, 'Kārta', NULL, NULL, false, false, 'E', 'R', 22);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (49, 'Skaitļa vārda tips', NULL, NULL, false, false, 'E', 'LR', 34);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (53, 'Lielo/mazo burtu lietojums', NULL, NULL, false, false, 'E', 'R', 38);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (54, 'Gramatiku analīzes problēmas', NULL, NULL, false, true, 'E', 'ESLR', 39);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (55, 'Semantisks frāzes raksturojums', NULL, NULL, false, true, 'E', 'R', 40);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (2, 'Citi', NULL, NULL, false, true, 'E', 'ESLR', 20);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (9, 'Konversija', NULL, NULL, false, true, 'E', 'ESLR', 4);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (29, 'Valoda', NULL, NULL, false, true, 'E', 'ESL', 10);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (47, 'Lietvārda tips', NULL, NULL, false, false, 'E', 'ESLR', 32);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (51, 'Īpašvārda veids', NULL, NULL, false, false, 'E', 'ESLR', 36);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (28, 'Transitivitāte', NULL, NULL, false, true, 'E', 'SL', 18);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (38, 'Locījums', NULL, NULL, false, true, 'E', 'R', 23);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (42, 'Izteiksme', NULL, NULL, false, true, 'E', 'R', 27);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (50, 'Vietniekvārda tips', NULL, NULL, false, false, 'E', 'SLR', 35);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (30, 'Šablons salikteņa vairākpunktu locīšanai', NULL, NULL, false, false, 'F', 'L', 11);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (37, 'Skaitlis', NULL, NULL, false, false, 'E', 'LR', 28);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (4, 'Dzimte', NULL, NULL, false, false, 'E', 'LR', 1);
INSERT INTO dict.grammar_flags (id, name, description, caption, is_deprecated, is_multiple, permitted_values, scope, order_no) VALUES (7, 'Kategorija', NULL, NULL, true, true, 'E', 'ESLR', 3);


--
-- Name: grammar_flags_id_seq; Type: SEQUENCE SET; Schema: dict; Owner: postgres
--

SELECT pg_catalog.setval('dict.grammar_flags_id_seq', 61, true);


--
-- PostgreSQL database dump complete
--

