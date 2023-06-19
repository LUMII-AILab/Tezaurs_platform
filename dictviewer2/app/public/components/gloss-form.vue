<template>
  <b-form-group label="Nozīmes skaidrojums" @click.native="clickOutsideBox">
    <div v-show="hasLinksInGloss" class="mb-1 mt-3 human-gloss" v-html="human"></div>
    <b-form-textarea v-model="gloss" rows="3"
                     ref="textBox"
                     v-on:keyup="onGlossCaret"
                     v-on:click="onGlossCaret"
                     v-on:keyup.ctrl.x="toggleSelect"
    ></b-form-textarea>
    <link-autocomplete :visible="autocomplete.visible"
                       ref="searchBox"
                       :gloss-link="autocomplete.glossLink"
                       :ignore-entry-id="entryId"
                       :type="autocomplete.type"
                       :search-input="autocomplete.searchInput"
                       :error="autocomplete.error"
                       v-on:select-entry="updateEntryGlossLink"
                       v-on:select-sense="updateSenseGlossLink"></link-autocomplete>
  </b-form-group>
</template>

<script>
  const defaultAutocomplete = {visible: false, entryId: null, id: null, searchInput: null, glossLink: null};
  module.exports = {
    props: ['entryId', 'senseId', 'senseGloss', 'glossLinks'],
    data: function () {
      return {
        autocomplete: extendDefault(defaultAutocomplete, {}),
        gloss: this.senseGloss,
        newId: 0,
        human: null,
        hasLinksInGloss: false,
        caretPos: null,
        hasGoodLinks: true,
        regexp: new RegExp('\\[(?<text>[^\\[]*)\\]\\{(?<type>[esn])?\\:?(?<id>[0-9]*)\\}', 'g'),
        regexpSearch: new RegExp('\\[(?<text>[^\\[]*)\\]\\{(?<type>[esn])\\:(?<id>[0-9]*)\\}')
      }
    },
    inject: ['setLoading'],
    watch: {
      'senseGloss': function(value, old) {
        this.gloss = value;
      },
      'gloss': function (value, old) {
        this.updateGloss(value);
        this.updateHumanGloss(value);
        this.$emit('update-gloss', value);
      },
      'hasGoodLinks': function (value) {
        this.$emit('update-validity', value);
      }
    },
    created() {
      if (this.gloss) {
        this.updateHumanGloss(this.gloss);
      }
    },
    methods: {
      replaceAt(str, start, end, replacement) {
        return str.substr(0, start) + replacement + str.substr(end);
      },
      getType: function (type) {
        return type === 'e' ? 'entry' : type === 's' ? 'sense' : 'new';
      },
      updateHumanGloss: function(gloss) {
        const matches = gloss.matchAll(this.regexp);
        this.hasLinksInGloss = false;
        this.hasGoodLinks = true;  // will be changed to false if any link was bad
        for (const match of matches) {
          const type = this.getType(match.groups.type);
          const glossLink = this.glossLinks[type].find(gl => gl.id == match.groups.id);
          let newHTML = this.createHumanGlossLink(match.groups.text, glossLink);
          let old = `[${match.groups.text}]{${match.groups.type}:${match.groups.id}}`;
          gloss = gloss.replace(old, newHTML);
          this.hasLinksInGloss = true;
        }
        this.human = gloss;
      },
      createHumanGlossLink: function(innerText, glossLink) {
        const isGood = glossLink && glossLink.entry_id !== null;
        if (!isGood) this.hasGoodLinks = false;
        const className = isGood ? 'gloss-link-good' : 'gloss-link-bad';
        if (!glossLink || !glossLink.entry_id) // malformed gloss text: the written id doesn't have a db entry OR no entry chosen yet
          return `<span class="gloss-link ${className}">???</span>`;
        if (glossLink.sense_2_id) {
          const fullOrderNo = (glossLink.sense.parent_order_no ? `${glossLink.sense.parent_order_no}.`: '') + glossLink.sense.order_no;
          innerText += '<sub>' + fullOrderNo + '</sub>';
        }
        return `<a href="${encodeURIComponent(glossLink.entry.human_key)}" target="_blank" class="gloss-link ${className}">${innerText}</a>`;
      },
      updateGloss: function(gloss) {
        const matches = gloss.matchAll(this.regexp);
        this.caretPos = this.$refs.textBox ? this.$refs.textBox.$el.selectionStart : 0;
        for (const match of matches) {
          if (match.groups.id === '') {
            const id = this.createStubForNewGlossLink();
            // todo: only works if one gloss was created
            const start = match.index + match.groups.text.length + 3;
            const end = match.index + match[0].length - 1;
            gloss = this.replaceAt(gloss, start, end,'n:' + id);
            console.log('Update gloss', gloss);
            this.caretPos = start; // move caret so that the search box opens
          }
        }
        this.gloss = gloss; // this will call updateGloss again (through 'watch')
      },
      createStubForNewGlossLink: function() {
        const link = {
          sense_id: this.senseId,
          entry_id: null,
          id: this.newId,
          sense: {}, entry: {}
        };
        this.$emit('add-link', link);
        this.newId++;
        return this.newId-1;
      },
      reset: function() {
        this.newId = 0;
        this.human = null;
        this.hasLinksInGloss = false;
        this.caretPo = null;
        this.hasGoodLinks = true;
        this.autocomplete = extendDefault(defaultAutocomplete, {});
      },
      updateEntryGlossLink: function(entry, type) {
        console.log("updateEntryGlossLink", entry);
        let index = this.glossLinks[type].findIndex(gl => gl.id === this.autocomplete.id);
        this.$emit('update-entry', type, index, entry);
        this.updateHumanGloss(this.gloss);
      },
      updateSenseGlossLink: function(sense, type) { // If sense is null then clear fields
        console.log("updateSenseGlossLink", sense);
        let index = this.glossLinks[type].findIndex(gl => gl.id === this.autocomplete.id);
        this.$emit('update-sense', type, index, sense);
        this.autocomplete.visible = sense === null; // Close if sense was selected: all done
        this.updateHumanGloss(this.gloss);
      },
      toggleSelect: function(e) {
        e.preventDefault();
        this.autocomplete.visible = !this.autocomplete.visible;
      },
      clickOutsideBox: function(e) {
        const insideSearch = this.$refs.searchBox.$el.contains(e.target);
        const insideText = this.$refs.textBox.$el.contains(e.target);
        console.log('inside search:', insideSearch, 'inside text:', insideText);

        if (!insideSearch && !insideText) { // close if clicked outside
          this.autocomplete.visible = false;
        }
      },
      forceMoveCaret: function () {
        if (this.caretPos) {
          const insideText = this.$refs.textBox.$el;
          insideText.setSelectionRange(this.caretPos, this.caretPos);
          console.log('Move caret to:', this.caretPos);
          this.caretPos = null;
        }
      },
      openSearchBox: function(match) {
        let type = match.groups.type === 'e' ? 'entry' : match.groups.type === 'n' ? 'new' : 'sense';
        let glossLink = this.glossLinks[type].find(gl => gl.id == match.groups.id);

        this.autocomplete = {
          id: glossLink ? glossLink.id : null,
          visible: true,
          glossLink: glossLink,
          type,
          searchInput: type === 'new' ? match.groups.text : null, // instantly search when making a new link,
          error: glossLink ? null : 'Slikta saite! Izdzēsiet un veidojiet jaunu!'
        };
      },
      onGlossCaret: function(e) {
        console.log('Caret at: ', e.target.selectionStart);
        this.forceMoveCaret(); // after adding a new gloss link the caret could be wrong

        let text = this.gloss.substr(0, e.target.selectionStart);
        text = text.substr(text.lastIndexOf("["));

        let idxOldEnd = this.gloss.substr(e.target.selectionStart).indexOf('}');
        let idxNewStart = this.gloss.substr(e.target.selectionStart).indexOf('[');
        const end = idxNewStart !== -1 && idxNewStart < idxOldEnd ? idxNewStart : idxOldEnd;
        if (idxOldEnd < 0) { // wrong brackets -> no match
          this.autocomplete.visible = false;
          return;
        }
        const caretPos = text.length;
        text = text + this.gloss.substr(e.target.selectionStart, end+1);

        const match = text.match(this.regexpSearch);
        if (match && (match[0] === text && caretPos >= (match.groups.text.length + 3))) {
            this.openSearchBox(match);
        } else {
          this.autocomplete.visible = false;
        }
      },
    },
  }
</script>

<style>
.gloss-link-bad {
  background-color: rgba(255, 0, 0, 0.5);
}
.gloss-link-good {
  background-color: rgba(0, 128, 0, 0.5);
}
.gloss-link {
  color: black;
  cursor: pointer;
  padding: 0.1rem 0.2rem;
  border-radius: 3px;
}
.human-gloss {
  color: darkslategrey;
  font-size: 0.85rem;
}
</style>
