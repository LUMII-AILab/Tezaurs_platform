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
-- Data for Name: users; Type: TABLE DATA; Schema: dict; Owner: postgres
--

INSERT INTO dict.users (id, login, full_name, password, organization, data) VALUES (1, 'system', 'System User', NULL, NULL, NULL);
INSERT INTO dict.users (id, login, full_name, password, organization, data) VALUES (2, 'unknown', 'unknown user', NULL, NULL, NULL);
INSERT INTO dict.users (id, login, full_name, password, organization, data) VALUES (3, 'script', 'batch script', NULL, NULL, NULL);
INSERT INTO dict.users (id, login, full_name, password, organization, data) VALUES (4, 'aspekt', 'Andrejs Spektors', NULL, 'MII', NULL);
INSERT INTO dict.users (id, login, full_name, password, organization, data) VALUES (5, 'baiba', 'Baiba Saulīte', NULL, 'MII', NULL);
INSERT INTO dict.users (id, login, full_name, password, organization, data) VALUES (6, 'laura', 'Laura Rituma', NULL, 'MII', NULL);
INSERT INTO dict.users (id, login, full_name, password, organization, data) VALUES (7, 'mikus', 'Mikus Grasmanis', NULL, 'MII', NULL);
INSERT INTO dict.users (id, login, full_name, password, organization, data) VALUES (8, 'normunds', 'Normunds Grūzītis', NULL, 'MII', NULL);
INSERT INTO dict.users (id, login, full_name, password, organization, data) VALUES (9, 'lauma', 'Lauma Pretkalniņa', NULL, 'MII', NULL);
INSERT INTO dict.users (id, login, full_name, password, organization, data) VALUES (10, 'peteris', 'Pēteris Paikens', NULL, 'MII', NULL);
INSERT INTO dict.users (id, login, full_name, password, organization, data) VALUES (11, 'arturs', 'Arturs Znotiņš', NULL, 'MII', NULL);
INSERT INTO dict.users (id, login, full_name, password, organization, data) VALUES (12, 'gunta', 'Gunta Nešpore-Bērzkalne', NULL, 'MII', NULL);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: dict; Owner: postgres
--

SELECT pg_catalog.setval('dict.users_id_seq', 12, true);


--
-- PostgreSQL database dump complete
--

