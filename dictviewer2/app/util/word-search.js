const WORD = Symbol('WORD');

let root = {}
let letters = [];

function add_word(word) {
    if (!word || word.length === 0) return;
    let larr = word.split('');
    let curr = root;
    for (let l of larr) {
        if (!curr[l]) curr[l] = {}
        curr = curr [l];
    }
    curr[WORD] = true;
}

function walk(o, start, end) {
    let curr = o;
    let pos = start;
    while (pos < end && curr[letters[pos]]) {
        curr = curr[letters[pos]];
        pos += 1;
    }
    if (pos === end) return curr;
    return null;
}

function dump_data() {
    console.log(JSON.stringify(root, null, 2));
}

function clear() {
    root = {};
}

function count_words(obj) {
    if (!obj) return count_words(root);
    let n = 0;
    if (obj[WORD]) n += 1;
    for (let k in obj) {
        n += count_words(obj[k])
    }
    return n;
}

function get_similar_words(slug) {
    let result = [];
    if (!slug ||slug.length < 1) return result;

    letters = slug.split('');
    let N = slug.length;
    let x, y;

    for (let p = 0; p <= N; p += 1) {
        // w = slug + iespraudums
        let x = walk(root, 0, p);
        if (x) {
            for (let ins in x) {
                y = walk(x[ins], p, N);
                if (y && y[WORD]) {
                    result.push([slug.slice(0,p) + ins + slug.slice(p), 'ins']);
                }
            }
        }

        // w = slug ar 1 nomainītu burtu
        x = walk(root, 0, p);
        if (x) {
            for (let changed in x) {
                if (changed === letters[p]) continue;
                y = walk(x[changed], p+1, N);
                if (y && y[WORD]) {
                    result.push([slug.slice(0,p) + changed + slug.slice(p+1), 'ch1']);
                }
            }
        }

        // w = slug - izmetums
        if (p < N) {
            x = walk(root, 0, p);
            if (x) {
                y = walk(x, p+1, N);
                if (y && y[WORD]) {
                    result.push([slug.slice(0, p) + slug.slice(p+1), 'del']);
                }
            }
        }

        // w = slug ar samainītiem kaimiņburtiem
        if (p < N - 1 && letters[p] !== letters[p+1]) {
            x = walk(root, 0, p);
            if (x) {
                x = walk(x, p+1, p+2);
                if (x) {
                    x = walk(x, p, p+1);
                    if (x) {
                        y = walk(x, p+2, N);
                        if (y && y[WORD]) {
                            result.push([slug.slice(0, p) + letters[p+1] + letters[p] + slug.slice(p+2), 'swap']);
                        }
                    }
                }
            }
        }
    }
    return result;
}

clear();

module.exports = {
    add_word,
    count_words,
    clear,
    get_similar_words,
    dump_data,
};
