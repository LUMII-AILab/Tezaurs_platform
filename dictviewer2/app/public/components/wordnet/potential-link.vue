<template>
  <div>
    <div class="container mt-3">
      <div class="row">
        {{error}}
        <div class="col-4">
          <div class="box">
            <div class="synset-sense">{{ currentLink.sense.heading }}<sub>{{ currentLink.sense.parent_order_no ? `${currentLink.sense.parent_order_no},${currentLink.sense.order_no}` : currentLink.sense.order_no }}</sub></div>
            <div class="synset-gloss">{{ currentLink.sense.gloss }}</div>
          </div>
          <div v-if="!readOnly" class="mt-3">
            <b-button class="btn-no mt-2" @click="submit('no')">Nē</b-button>
            <b-button class="btn-maybe mt-2" @click="submit('more_info_needed')">Vajag vairāk info</b-button>
            <b-button class="btn-maybe mt-2" @click="submit('not_eq')">Šaurāks/plašāks</b-button>
          </div>
        </div>
        <div class="col">
          <div class="box mb-2 link" :class="readOnly ? 'read-only' : ''" v-for="guess in currentLink.guesses.slice(0, maxTopOptionCount)" @click="submit('yes', guess.id)">
            <div class="link-no pr-2 my-auto">#{{guess.no}}</div>
            <div class="link-info pl-2">
<!--              <span class="font-weight-light small">{{guess.score}}</span>-->
              <div>
                <span v-if="guess.synset.display_pos" class="text-info">({{guess.synset.display_pos}})</span>
                <span class="synset-sense">{{ guess.synset.senses.join(', ') }}</span>
              </div>
              <div class="synset-gloss">{{guess.synset.gloss}}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  module.exports = {
    props: ['link', 'readOnly'],
    data: function () {
      return {
        currentLink: this.link,
        nextLinks: [],
        maxLinkCount: 5,
        maxTopOptionCount: 5,
        error: null
      }
    },
    mounted: function() {
      this.loadNext();
    },
    methods: {
      submit: function(answer, guess_id=null) {
        if (this.readOnly) return;
        // create answer user_id, guess_id, answer_type, timestamp
        axios.post(`/_/wordnet/potential_links/${this.currentLink.id}`, {
          id: this.currentLink.id,
          guess_id,
          answer
        }).then((r) => {
            if (r.data.error) throw new Error(r.data.error);
        }).then(this.showNext)
        .catch(e => this.error = e)
      },
      showNext: function() {
        if (this.nextLinks.length > 0) {
          console.log('showing next', this.nextLinks.length);
          this.currentLink = this.nextLinks.shift();
          this.loadNext();
        }
      },
      loadNext: function() {
        if (this.readOnly) return;
        axios.get(`/_/wordnet/potential_links/next/${this.currentLink.order_no}/${this.nextLinks.length}/${this.maxLinkCount}`)
          .then((r) => {
            if (r.data.error)
              throw new Error(r.data.error);
            console.log('next', r.data);
            r.data.forEach(l => this.nextLinks.push(l));
          })
          .catch(e => this.error = e)
      }
    }
  }
</script>

<style scoped>
.synset-sense {
  font-size: 1rem;
  font-weight: 500;
}
.synset-gloss {
  font-size: 0.9rem;
  font-weight: 300;
}

.box {
  background-color: #f6f6f6;
  border-radius: 0.25rem;
  padding: .5rem;
  border: 1px solid black;
}
.box.link:not(.read-only):hover {
  background-color: rgb(165 214 167);
  cursor: pointer;
  border: 1px solid forestgreen;
}
.box.link:not(.read-only):hover .link-info {
  border-left: 1px solid forestgreen;
}
.box.link:not(.read-only):hover .link-no {
  color: forestgreen;
}
.link {
  display: flex;
  flex: 30px auto;
}
.link-info {
  border-left: 1px solid white;
}
.btn-no {
  background-color: #ff8a65;
  color: black;
}
.btn-no:hover {
  background-color: #ff683c;
}
.btn-maybe {
  background-color: #ffecb3;
  color: black;
}
.btn-maybe:hover {
  background-color: #ffde7a;
}
</style>
