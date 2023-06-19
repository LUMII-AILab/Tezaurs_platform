CREATE OR REPLACE FUNCTION dict.disable_audit()
 RETURNS void
 LANGUAGE plpgsql
AS $function$begin
	alter table dict.entries disable trigger log_entries;
	alter table dict.senses disable trigger log_senses;
	alter table dict.lexemes disable trigger log_lexemes;
	alter table dict.examples disable trigger log_examples;
	alter table dict.sense_relations disable trigger log_sense_relations;
	alter table dict.sense_entry_relations disable trigger log_sense_entry_relations;
	alter table dict.entry_relations disable trigger log_entry_relations;
	alter table dict.source_links disable trigger log_source_links;
end;$function$
;
