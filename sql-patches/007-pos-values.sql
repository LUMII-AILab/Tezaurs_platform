DELETE FROM dict.grammar_flag_values WHERE flag_id = 60;

INSERT INTO dict.grammar_flag_values (flag_id, value, order_no)
VALUES
  (60, 'Lietvārds', 1),
  (60, 'Darbības vārds', 2),
  (60, 'Īpašības vārds', 3),
  (60, 'Vietniekvārds', 4),
  (60, 'Apstākļa vārds', 5),
  (60, 'Prievārds', 6),
  (60, 'Saiklis', 7),
  (60, 'Skaitļa vārds', 8),
  (60, 'Izsauksmes vārds', 9),
  (60, 'Saīsinājums', 10),
  (60, 'Partikula', 11),
  (60, 'Pieturzīme', 12),
  (60, 'Reziduālis', 13);
