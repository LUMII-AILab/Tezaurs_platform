function toggleCollapsible(name, e) {
  var code = (e.keyCode ? e.keyCode : e.which);
  if (e.keyCode == undefined || code == 13) {
    $("#" + name).slideToggle('slow', 'swing');
    $("#" + name + "-expand").toggle(0);
    $("#" + name + "-collapse").toggle(0);
    $("#" + name).focus();
  }
}

function closeCollapsible(name) {
  $("#" + name).hide({ easing: 'swing' });
  $("#" + name + "-expand").show();
  $("#" + name + "-collapse").hide();
}

function openCollapsible(name) {
  $("#" + name).show({ easing: 'swing' });
  $("#" + name + "-expand").hide();
  $("#" + name + "-collapse").show();
}

function setSettingsValue(name, value) {
  // console.log('setOption', name, value);
  localStorage.setItem(name, JSON.stringify(value));
}
function getSettingsValue(name, defaultValue = false) {
  try {
    const x0 = localStorage.getItem(name);
    // console.log('getOption', name, x0);
    if (x0 === null) return defaultValue;

    const x = JSON.parse(x0);
    // console.log(x, typeof x);
    return x;
  } catch (err) {
    return defaultValue;
  }
}

function listSettings() {
  for (let i = 0; i < localStorage.length; i += 1) {
    console.log(localStorage.key(i), localStorage.getItem(localStorage.key(i)));
  }
}

function getExplanation(e) {
  let data = e.getAttribute('data-tippy-content');
  let searchTerm = e.getAttribute('data-search');
  if (!data && searchTerm) {
    let relation = e.getAttribute('data-relation');
    $.get(`/_search/${searchTerm}/1`, function (r) {
      document.querySelectorAll(`[data-relation='${relation}']`).forEach(
        el => el.setAttribute('data-tippy-content', r)
      );
      if (r) tippy(`[data-relation='${relation}']`, { trigger: 'mouseenter click', hideOnClick: true, interactive: true, allowHTML: true, showOnCreate: true });
    })
  }
}

function isEncodedURIComponent(arg) {
  return decodeURIComponent(arg) !== arg;
}

if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, 'startsWith', {
    value: function (search, rawPos) {
      var pos = rawPos > 0 ? rawPos | 0 : 0;
      return this.substring(pos, pos + search.length) === search;
    }
  });
}

function expandAll(groupName = null) {
  const className = groupName ? `entry-collapse-container-${groupName}` : 'entry-collapse-container';
  const l = document.getElementsByClassName(className);
  for (let i = 0; i < l.length; i += 1) {
    openCollapsible(l[i].id)
  }
}
function collapseAll(groupName = null) {
  const className = groupName ? `entry-collapse-container-${groupName}` : 'entry-collapse-container';
  const l = document.getElementsByClassName(className);
  for (let i = 0; i < l.length; i += 1) {
    closeCollapsible(l[i].id)
  }
}
function toggleAll(groupName = null) {
  const className = groupName ? `entry-collapse-container-${groupName}` : 'entry-collapse-container';
  const l = document.getElementsByClassName(className);
  for (let i = 0; i < l.length; i += 1) {
    toggleCollapsible(l[i].id, new Event('click'))
  }
}

// const SETTINGS_ENTRY_EXPANDALL = 'settings.entry.expandAll';

function applySettings() {
  // if (getSettingsValue(SETTINGS_ENTRY_EXPANDALL)) {
  //   // toggleAll();
  //   expandAll();
  // }

  const settingsDefs = JSON.parse(window.localStorage.getItem('settingsDefs'));
  if (settingsDefs) {
    for (const { group, name, commandParam } of settingsDefs) {
      if (group === 'autoExpand') {
        if (getSettingsValue(name)) {
          expandAll(commandParam);
        }
      }
    }
  }
}

$(document).ready(function () {
  applySettings();

  $(".js-only").css("visibility", "visible");
/*
  // šo laikam vairs nevajag?
  let mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (mobile) {
    $(".collapser-link-collapse").css("display", "none");
    $(".collapser-link-expand").css("display", "inline");
    $(".collapser-container").css("display", "none");
  }
*/
  $("#searchField").select();

  $("#searchForm").submit(function () {
    var w = $("#searchField").val();
    $("#searchField").val("");
    $("#searchField").select();
    $("#keyboard").hide();

    if (!w.trim()) return false;
    if (w.startsWith('search ')) {
      window.location.href = `/_search/${encodeURIComponent(w.slice(7)).replace('%3A', ':')}`;
    } else if (w.startsWith('s ')) {
      window.location.href = `/_search/${encodeURIComponent(w.slice(2)).replace('%3A', ':')}`;
    } else if (w.indexOf('*') > -1) {
      window.location.href = `/_search/${encodeURIComponent(w).replace('%3A', ':')}`;
    } else {
      window.location.href = `/${encodeURIComponent(w).replace('%3A', ':')}`;
    }
    return false;
  });

  /*
      $(".blank").click(function() {
          // $("#searchResults").html("");
          // $("#sideNotes").html("");
          $("#keyboard").hide();
      });
  */

  $("#keyboard").hide();
  $("#keyboard_SVG").click(function () {
    $("#keyboard").toggle();
    $("#searchField").focus();
  });

  $(".key").click(function () {
    $("#searchField").val($("#searchField").val() + $(this).data("letter"));
    $("#searchField").focus();
  });

  $(".img-hover")
    .mouseover(function () { $(this).css("opacity", 0.85) })
    .mouseout(function () { $(this).css("opacity", 1.0) });

  if (!Modernizr.svg) {
    $("#Tezaurs_SVG").attr("src", "img/Tezaurs.png");
    $("#keyboard_SVG").attr("src", "img/keyboard.png");
    $("#LU_SVG").attr("src", "img/LU.png");
    $("#MII_SVG").attr("src", "img/MII.png");
    $("#AILab_SVG").attr("src", "img/AILab.png");
    // $(".expand_SVG").attr("src", "img/expand.png");
    // $(".collapse_SVG").attr("src", "img/collapse.png");
  }

  // Feedback form - START
  $("#feedbackText").hide();

  $("#twitterButton").click(function () {
    let viaAddress;
    switch (window.DICT) {
      case 'mlvv':
        viaAddress = 'LU_LaVI';
        break;

      default:
        viaAddress = 'AiLab_lv';
        break;
    }
    var tweet = 'https://twitter.com/intent/tweet?text=Sk.&url=' + encodeURIComponent(location.href).replace('%3A', ':') + '&via=' + viaAddress;

    var width = 550, height = 420;
    var left = ($(window).width() - width) / 2;
    var top = ($(window).height() - height) / 2;
    var opts = 'status=yes,width=' + width + ',height=' + height + ',top=' + top + ',left=' + left;

    window.open(tweet, '', opts);

    $("#twitterButton").blur();

    return false;
  });

  // $('#feedbackText').change(function(e) {
  //   let t = e.target.value;
  //   $("#feedbackButtonLabel").text(t ? "Nosūtīt": "Neziņot");
  // });

  $("#feedbackButton").click(function () {
    if ($('#feedbackText').is(':hidden')) {
      // console.log('aaa')
      $('#feedbackText').show();
      $("#feedbackText").focus();
      // $("#feedbackButtonLabel").text("Nosūtīt");
      $('#feedbackText').change();
      $("#feedbackResponse").html('');
    } else {
      // console.log('bbb')
      if (!$("#feedbackText").val().trim()) {
        // console.log('bbb 2')
        $("#feedbackText").val("");
        $('#feedbackText').hide();
        $("#feedbackButton").blur();
        $("#feedbackButtonLabel").text("Ziņot");
        return;
      }
      // console.log('bbb 3')
      var word = window.location.pathname;
      word = decodeURIComponent(word);

      let sel = window.getSelection().toString();
      // console.log(sel);
      var formData = {
        // 'word' : word,
        'text': $('#feedbackText').val().trim(),
        'entry_id': $('#feedbackEntryId').val(),
      };
      // console.log(formData);
      // $.post('http://tezaurs.lv/_issues/api/feedback/create', formData, function() {
      // console.log('bbb 4')
      $.post('/_issues/api/feedback/create', formData, function () {
        // console.log('bbb 5')
        $("#feedbackResponse").html('<span class="status-ok">Paldies!</span>').show().delay(3000).fadeOut();
        $("#feedbackText").val("");
        $('#feedbackText').hide();
        $("#feedbackButton").blur();
        $("#feedbackButtonLabel").text("Ziņot");
      })
        .fail(function (error) {
          // console.log('bbb 6')
          console.error('error posting feedback', error);
          $("#feedbackResponse").html('<span class="status-fail">Neizdevās...</span>').show().delay(3000).fadeOut();
          $("#feedbackButton").blur();
        });
    }
  });
  // Feedback form - END

  console.log(new Date().getTime() - performance.timing.navigationStart);
  const [entry] = performance.getEntriesByType("navigation");
  // console.table(entry.toJSON());
});
