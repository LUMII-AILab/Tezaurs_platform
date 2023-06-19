-- Table: dict.full_entries

DROP TABLE IF EXISTS dict.full_entries;

--
-- Name: full_entries; Type: TABLE; Schema: dict; Owner: postgres
--

CREATE TABLE dict.full_entries (
    id integer NOT NULL,
    entry_id integer NOT NULL,
    human_key text NOT NULL,
    data jsonb,
    html text,
    heading text NOT NULL,
    homonym_no integer NOT NULL
);


ALTER TABLE dict.full_entries OWNER TO postgres;

--
-- Name: TABLE full_entries; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON TABLE dict.full_entries IS 'Pilni, denormalizēti šķirkļi';


--
-- Name: full_entries_id_seq; Type: SEQUENCE; Schema: dict; Owner: postgres
--

CREATE SEQUENCE dict.full_entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE dict.full_entries_id_seq OWNER TO postgres;

--
-- Name: full_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: dict; Owner: postgres
--

ALTER SEQUENCE dict.full_entries_id_seq OWNED BY dict.full_entries.id;


--
-- Name: full_entries id; Type: DEFAULT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.full_entries ALTER COLUMN id SET DEFAULT nextval('dict.full_entries_id_seq'::regclass);


--
-- Name: full_entries full_entries_heading_homonym_no_key; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.full_entries
    ADD CONSTRAINT full_entries_heading_homonym_no_key UNIQUE (heading, homonym_no);


--
-- Name: full_entries full_entries_human_key; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.full_entries
    ADD CONSTRAINT full_entries_human_key UNIQUE (human_key);


--
-- Name: full_entries full_entries_pk; Type: CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.full_entries
    ADD CONSTRAINT full_entries_pk PRIMARY KEY (id);


--
-- Name: idx_full_entries_entry_id; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_full_entries_entry_id ON dict.full_entries USING btree (entry_id);


--
-- Name: INDEX idx_full_entries_entry_id; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_full_entries_entry_id IS 'Indekss pēc entry_id';


--
-- Name: idx_full_entries_heading; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_full_entries_heading ON dict.full_entries USING btree (heading text_pattern_ops);


--
-- Name: idx_full_entries_human_key; Type: INDEX; Schema: dict; Owner: postgres
--

CREATE INDEX idx_full_entries_human_key ON dict.full_entries USING btree (human_key COLLATE dict.latviski text_pattern_ops);


--
-- Name: INDEX idx_full_entries_human_key; Type: COMMENT; Schema: dict; Owner: postgres
--

COMMENT ON INDEX dict.idx_full_entries_human_key IS 'Indekss pēc human_key';


--
-- Name: full_entries full_entries_entry_fk; Type: FK CONSTRAINT; Schema: dict; Owner: postgres
--

ALTER TABLE ONLY dict.full_entries
    ADD CONSTRAINT full_entries_entry_fk FOREIGN KEY (entry_id) REFERENCES dict.entries(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

