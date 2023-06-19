SET client_encoding = 'UTF8';

DELETE FROM dict.sources;

ALTER SEQUENCE dict.sources_id_seq RESTART WITH 1;

INSERT INTO dict.sources (
    abbr,
    title,
    bib,
    url
)
VALUES
('1', 'Latviešu literārās valodas vārdnīca. 1 sēj.', NULL, NULL),
('2', 'Latviešu literārās valodas vārdnīca. 2 sēj.', NULL, NULL),
('3', 'Latviešu literārās valodas vārdnīca. 3 sēj.', NULL, NULL),
('4', 'Latviešu literārās valodas vārdnīca. 4 sēj.', NULL, NULL),
('5', 'Latviešu literārās valodas vārdnīca. 5 sēj.', NULL, NULL),
('6-1', 'Latviešu literārās valodas vārdnīca. 6-1 sēj.', NULL, NULL),
('6-2', 'Latviešu literārās valodas vārdnīca. 6-2 sēj.', NULL, NULL),
('7-1', 'Latviešu literārās valodas vārdnīca. 7-1 sēj.', NULL, NULL),
('7-2', 'Latviešu literārās valodas vārdnīca. 7-2 sēj.', NULL, NULL),
('8', 'Latviešu literārās valodas vārdnīca. 8 sēj.', NULL, NULL);
