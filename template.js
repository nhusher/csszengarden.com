var MicroTemplate = {};

MicroTemplate.OPTIONS = {
    code          : /<%([\s\S]+?)%>/g,
    escapedOutput : /\$\{([\s\S]+?)\}/g,
    rawOutput     : /\$\{\{([\s\S]+?)\}\}/g,
    stringEscape  : /('|\r|\n|\t|\u2028|\u2029|\\)/g
};

MicroTemplate.TEMPLATE_ESCAPE = {
    '\n'     : '\\n',
    '\t'     : '\\t',
    '\r'     : '\\r',
    '\u2028' : '\\u2028',
    '\u2029' : '\\u2029',
    '\\'     : '\\\\'
};

MicroTemplate.STRING_ESCAPE = {
    '&' : '&amp;',
    '<' : '&lt;',
    '>' : '&gt;',
    '"' : '&quot;',
    "'" : '&#x27;',
    '/' : '&#x2F;',
    '`' : '&#x60;'
};

MicroTemplate.escape = function (s) {
    return (s + '').replace(/[&<>"'\/`]/g, function (match) {
        return MicroTemplate.STRING_ESCAPE[match];
    });
};

MicroTemplate.render = function (text, data) {
    return MicroTemplate.compile(text)(data);
};

MicroTemplate.compile = function (text, precompile) {
    var blocks = [],
        tokenClose = "\uffff",
        tokenOpen = "\ufffe",
        options = MicroTemplate.OPTIONS,
        source,
        out;

    // Parse the input text into a string of JavaScript code, with placeholders
    // for code blocks. Text outside of code blocks will be escaped for safe
    // usage within a double-quoted string literal.
    source = "var $b='', $v=function (v){ return v || v === 0 ? v : $b; }, $t='" +

        // U+FFFE and U+FFFF are guaranteed to represent non-characters, so no
        // valid UTF-8 string should ever contain them. That means we can freely
        // strip them out of the input text (just to be safe) and then use them
        // for our own nefarious purposes as token placeholders!
        //
        // See http://en.wikipedia.org/wiki/Mapping_of_Unicode_characters#Noncharacters
        text.replace(/\ufffe|\uffff/g, '')

            .replace(options.rawOutput, function (match, code) {
                return tokenOpen + (blocks.push("'+\n$v(" + code + ")+\n'") - 1) + tokenClose;
            })

            .replace(options.escapedOutput, function (match, code) {
                return tokenOpen + (blocks.push("'+\n$e($v(" + code + "))+\n'") - 1) + tokenClose;
            })

            .replace(options.code, function (match, code) {
                return tokenOpen + (blocks.push("';\n" + code + "\n$t+='") - 1) + tokenClose;
            })

            .replace(options.stringEscape, function (match) {
                return MicroTemplate.TEMPLATE_ESCAPE[match];
            })

            // Replace the token placeholders with code.
            .replace(/\ufffe(\d+)\uffff/g, function (match, index) {
                return blocks[parseInt(index, 10)];
            })

            // Remove noop string concatenations that have been left behind.
            .replace(/\n\$t\+='';\n/g, '\n') +

        "';\nreturn $t;";

    // If compile() was called from precompile(), return precompiled source.

    if (precompile) {
        out = "function ($e, data) {\n" + source + "\n}";
    } else {
        // TODO: try/catch this
        out = MicroTemplate.revive(new Function('$e', 'data', source));
    }

    return out;
};

/**
 @method precompile
 @static
 @param text {String}
 @return {String}
 */
MicroTemplate.precompile = function (text) {
    return this.compile(text, true);
};

/**
 @method revive
 @static
 @param precompiled {Function}
 @param {String}
 */
MicroTemplate.revive = function (precompiled) {
    return function (data) {
        data = data || {};

        return precompiled.call(data, MicroTemplate.escape, data);
    }
};

module.exports = MicroTemplate;