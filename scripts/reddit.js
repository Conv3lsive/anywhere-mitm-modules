var DROP = {};
var TARGET_FIELDS = /commentsPageAds|AdPost|AdMetadataCell|isAdPost|adPayload|isNsfw/;

function process(ctx) {
  if (ctx.phase !== "response" || !ctx.body) return;

  var text;
  try { text = Anywhere.codec.utf8.decode(ctx.body); } catch (_) { return; }
  if (!TARGET_FIELDS.test(text)) return;

  var root;
  try { root = JSON.parse(text); } catch (_) { return; }
  if (!root || typeof root !== "object") return;
  var disableNsfw = parameter("disable_nsfw_prompt", "true").toLowerCase();
  disableNsfw = disableNsfw !== "false" && disableNsfw !== "0" && disableNsfw !== "off";
  var state = { changed: false };
  var output;
  try { output = jqWalk(root, disableNsfw, state, 0); } catch (_) { return; }
  if (output === DROP) output = {};
  if (!state.changed) return;
  ctx.body = Anywhere.codec.utf8.encode(JSON.stringify(output));
  Anywhere.done();
}

// Exact post-order equivalent of jq walk(f): children first, then f(value).
function jqWalk(value, disableNsfw, state, depth) {
  if (depth > 256) throw new RangeError("GraphQL JSON nesting exceeds limit");
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    for (var i = value.length - 1; i >= 0; i--) {
      var item = jqWalk(value[i], disableNsfw, state, depth + 1);
      if (item === DROP) value.splice(i, 1);
      else value[i] = item;
    }
    return value;
  }

  var keys = Object.keys(value);
  for (var j = 0; j < keys.length; j++) {
    var child = jqWalk(value[keys[j]], disableNsfw, state, depth + 1);
    if (child === DROP) delete value[keys[j]];
    else value[keys[j]] = child;
  }

  if (disableNsfw) {
    if (value.isNsfw === true) { value.isNsfw = false; state.changed = true; }
    if (value.isNsfwMediaBlocked === true) { value.isNsfwMediaBlocked = false; state.changed = true; }
    if (value.isNsfwContentShown === false) { value.isNsfwContentShown = true; state.changed = true; }
  }
  if (Array.isArray(value.commentsPageAds)) {
    if (value.commentsPageAds.length) state.changed = true;
    value.commentsPageAds = [];
  }
  var node = value.node;
  if (node && typeof node === "object" && !Array.isArray(node)) {
    var cells = node.cells;
    if (Array.isArray(cells)) {
      for (var k = 0; k < cells.length; k++) {
        if (cells[k] && (cells[k].__typename === "AdMetadataCell" || cells[k].isAdPost === true)) {
          state.changed = true;
          return DROP;
        }
      }
    }
    if (node.adPayload && typeof node.adPayload === "object" && !Array.isArray(node.adPayload)) {
      state.changed = true;
      return DROP;
    }
  }
  if (value.__typename === "AdPost") {
    state.changed = true;
    return DROP;
  }
  return value;
}

function parameter(name, fallback) {
  try {
    var value = Anywhere.params.get(name);
    if (value !== undefined && value !== null && String(value) !== "") return String(value);
  } catch (_) {}
  return fallback;
}
