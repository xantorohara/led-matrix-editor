$(function () {
    var $previews = $('#previews');
    var $hexInput = $('#input');
    var $insertButton = $('#insertButton');
    var $deleteButton = $('#deleteButton');
    var $updateButton = $('#updateButton');
    var $leds = $('#leds');

    var generator = {
        tableCols: function () {
            var out = ['<table class="cols"><tr>'];
            for (var i = 1; i < 9; i++) {
                out.push('<td data-col="' + i + '">' + i + '</td>');
            }
            out.push('</tr></table>');
            return out.join('');
        },
        tableRows: function () {
            var out = ['<table class="rows">'];
            for (var i = 1; i < 9; i++) {
                out.push('<tr><td data-row="' + i + '">' + i + '</td></tr>');
            }
            out.push('</table>');
            return out.join('');
        },
        tableLeds: function () {
            var out = ['<table class="leds">'];
            for (var i = 1; i < 9; i++) {
                out.push('<tr>');
                for (var j = 1; j < 9; j++) {
                    out.push('<td data-row="' + i + '" data-col="' + j + '"></td>');
                }
                out.push('</tr>');
            }
            out.push('</table>');
            return out.join('');
        }
    };

    var converter = {
        patternToPreview: function (pattern) {
            var out = ['<table class="preview" data-hex="' + pattern + '">'];
            for (var i = 1; i < 9; i++) {
                var byte = pattern.substr(-2 * i, 2);
                byte = parseInt(byte, 16);

                out.push('<tr>');
                for (var j = 0; j < 8; j++) {
                    if ((byte & 1 << j)) {
                        out.push('<td class="active"></td>');
                    } else {
                        out.push('<td></td>');
                    }
                }
                out.push('</tr>');
            }
            out.push('</table>');
            return out.join('');
        },
        patternsToCodeUint64Array: function (patterns) {
            var out = ['const uint64_t IMAGES[] = {\n'];

            for (var i = 0; i < patterns.length; i++) {
                out.push('  0x');
                out.push(patterns[i]);
                out.push(',\n');
            }
            out.pop();
            out.push('\n};\n');
            out.push('const int IMAGES_LEN = sizeof(IMAGES)/8;\n');

            return out.join('');
        },
        patternsToCodeBytesArray: function (patterns) {
            var out = ['const byte IMAGES[][8] = {\n'];

            for (var i = 0; i < patterns.length; i++) {
                out.push('{\n');
                for (var j = 7; j >= 0; j--) {
                    var byte = patterns[i].substr(2 * j, 2);
                    byte = parseInt(byte, 16).toString(2);
                    byte = ('00000000' + byte).substr(-8);
                    byte = byte.split('').reverse().join('');
                    out.push('  B');
                    out.push(byte);
                    out.push(',\n');
                }
                out.pop();
                out.push('\n}');
                out.push(',');
            }
            out.pop();
            out.push('};\n');
            out.push('const int IMAGES_LEN = sizeof(IMAGES)/8;\n');
            return out.join('');
        },
        fixPattern: function (pattern) {
            pattern = pattern.replace(/[^0-9a-fA-F]/g, '0');
            return ('0000000000000000' + pattern).substr(-16);
        },
        fixPatterns: function (patterns) {
            for (var i = 0; i < patterns.length; i++) {
                patterns[i] = converter.fixPattern(patterns[i]);
            }
            return patterns;
        }
    };

    function makePreviewElement(pattern) {
        pattern = converter.fixPattern(pattern);
        return $(converter.patternToPreview(pattern)).click(onPreviewClick);
    }

    function ledsToHex() {
        var out = [];
        for (var i = 1; i < 9; i++) {
            var byte = [];
            for (var j = 1; j < 9; j++) {
                var active = $leds.find('td[data-row=' + i + '][data-col=' + j + '] ').hasClass('active');
                byte.push(active ? '1' : '0');
            }
            byte.reverse();
            byte = parseInt(byte.join(''), 2).toString(16);
            byte = ('0' + byte).substr(-2);
            out.push(byte);
        }
        out.reverse();
        $hexInput.val(out.join(''));
    }

    function hexInputToLeds() {
        var val = getInputHexValue();
        for (var i = 1; i < 9; i++) {
            var byte = val.substr(-2 * i, 2);

            byte = parseInt(byte, 16);
            for (var j = 1; j < 9; j++) {
                var active = !!(byte & 1 << (j - 1));
                $leds.find('td[data-row=' + i + '][data-col=' + j + '] ').toggleClass('active', active);
            }
        }
    }

    var savedHashState;

    function printArduinoCode(patterns) {
        if (patterns.length) {
            var code;
            if ($('#imagesAsByteArrays').prop("checked")) {
                code = converter.patternsToCodeBytesArray(patterns);
            } else {
                code = converter.patternsToCodeUint64Array(patterns);
            }
            $('#output').val(code);
        }
    }

    function previewsToPatterns() {
        var out = [];
        $previews.find('.preview').each(function () {
            out.push($(this).attr('data-hex'));
        });
        return out;
    }

    function saveState() {
        var patterns = previewsToPatterns();
        printArduinoCode(patterns);
        window.location.hash = savedHashState = patterns.join('|');
    }

    function loadState() {
        savedHashState = window.location.hash.slice(1);
        $previews.empty();
        var preview;
        var patterns = savedHashState.split('|');
        patterns = converter.fixPatterns(patterns);

        for (var i = 0; i < patterns.length; i++) {
            preview = makePreviewElement(patterns[i]);
            $previews.append(preview);
        }
        preview.addClass('selected');
        $hexInput.val(preview.attr('data-hex'));
        printArduinoCode(patterns);
        hexInputToLeds();
    }

    function getInputHexValue() {
        return converter.fixPattern($hexInput.val());
    }

    function onPreviewClick() {
        $hexInput.val($(this).attr('data-hex'));
        processToSave($(this));
        hexInputToLeds();
    }

    function processToSave($focusToPreview) {
        $previews.find('.preview.selected').removeClass('selected');

        if ($focusToPreview.length) {
            $focusToPreview.addClass('selected');
            $deleteButton.removeAttr('disabled');
            $updateButton.removeAttr('disabled');
        } else {
            $deleteButton.attr('disabled', 'disabled');
            $updateButton.attr('disabled', 'disabled');
        }
        saveState();
    }

    $('#cols').append($(generator.tableCols()));
    $('#rows').append($(generator.tableRows()));
    $leds.append($(generator.tableLeds()));

    $leds.find('td').mousedown(function () {
        $(this).toggleClass('active');
        ledsToHex();
    });

    $('#invertButton').click(function () {
        $leds.find('td').toggleClass('active');
        ledsToHex();
    });

    $('#clearButton').click(function () {
        $leds.find('td').removeClass('active');
        ledsToHex();
    });

    $('#shiftUpButton').click(function () {
        var val = '00' + getInputHexValue().substr(0, 14);
        $hexInput.val(val);
        hexInputToLeds();
    });

    $('#shiftDownButton').click(function () {
        var val = getInputHexValue().substr(2, 14) + '00';
        $hexInput.val(val);
        hexInputToLeds();
    });

    $('#shiftRightButton').click(function () {
        var val = getInputHexValue();

        var out = [];
        for (var i = 0; i < 8; i++) {
            var byte = val.substr(i * 2, 2);
            byte = parseInt(byte, 16);
            byte <<= 1;
            byte = byte.toString(16);
            byte = ('0' + byte).substr(-2);
            out.push(byte);
        }
        val = out.join('');
        $hexInput.val(val);
        hexInputToLeds();
    });

    $('#shiftLeftButton').click(function () {
        var val = getInputHexValue();

        var out = [];
        for (var i = 0; i < 8; i++) {
            var byte = val.substr(i * 2, 2);
            byte = parseInt(byte, 16);
            byte >>= 1;
            byte = byte.toString(16);
            byte = ('0' + byte).substr(-2);
            out.push(byte);
        }
        val = out.join('');
        $hexInput.val(val);
        hexInputToLeds();
    });

    $('table.cols td').mousedown(function () {
        var col = $(this).attr('data-col');
        $leds.find('td[data-col=' + col + ']').toggleClass('active',
            $leds.find('td[data-col=' + col + '].active').length != 8);
        ledsToHex();
    });

    $('table.rows td[data-row]').mousedown(function () {
        var row = $(this).attr('data-row');
        $leds.find('td[data-row=' + row + ']').toggleClass('active',
            $leds.find('td[data-row=' + row + '].active').length != 8);
        ledsToHex();
    });

    $hexInput.keyup(function () {
        hexInputToLeds();
    });

    $deleteButton.click(function () {
        var $selectedPreview = $previews.find('.preview.selected').first();
        var $nextPreview = $selectedPreview.next('.preview').first();

        if (!$nextPreview.length) {
            $nextPreview = $selectedPreview.prev('.preview').first();
        }

        $selectedPreview.remove();

        if ($nextPreview.length) {
            $hexInput.val($nextPreview.attr('data-hex'));
        }

        processToSave($nextPreview);

        hexInputToLeds();
    });

    $insertButton.click(function () {
        var $newPreview = makePreviewElement(getInputHexValue());
        var $selectedPreview = $previews.find('.preview.selected').first();

        if ($selectedPreview.length) {
            $selectedPreview.after($newPreview);
        } else {
            $previews.append($newPreview);
        }

        processToSave($newPreview);
    });

    $updateButton.click(function () {
        var $newPreview = makePreviewElement(getInputHexValue());
        var $selectedPreview = $previews.find('.preview.selected').first();

        if ($selectedPreview.length) {
            $selectedPreview.replaceWith($newPreview);
        } else {
            $previews.append($newPreview);
        }

        processToSave($newPreview);
    });

    $('#imagesAsByteArrays').change(function () {
        var patterns = previewsToPatterns();
        printArduinoCode(patterns);
    });

    $('#indexSelectsWhole').hover(function () {
        $('table.cols td').addClass('hover');
        $('table.rows td').addClass('hover');
    }, function () {
        $('table.cols td').removeClass('hover');
        $('table.rows td').removeClass('hover');
    });

    $(window).on('hashchange', function () {
        if (window.location.hash.slice(1) != savedHashState) {
            loadState();
        }
    });

    $previews.sortable({
        stop: function (event, ui) {
            saveState();
        }
    });

    loadState();
});
