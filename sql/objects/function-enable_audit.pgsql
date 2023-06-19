CREATE OR REPLACE FUNCTION dict.enable_audit()
 RETURNS void
 LANGUAGE plpgsql
AS $function$begin
	alter table dict.entries enable trigger log_entries;
	alter table dict.senses enable trigger log_senses;
	alter table dict.lexemes enable trigger log_lexemes;
	alter table dict.examples enable trigger log_examples;
	alter table dict.sense_relations enable trigger log_sense_relations;
	alter table dict.sense_entry_relations enable trigger log_sense_entry_relations;
	alter table dict.entry_relations enable trigger log_entry_relations;
	alter table dict.source_links enable trigger log_source_links;
end;$function$
;
