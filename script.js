$(function () {
    var $previews = $('#previews');
    var $hexInput = $('#input');
    var $insertButton = $('#insertButton');
    var $deleteButton = $('#deleteButton');
    var $outputTextarea = $('#output');
    var $updateButton = $('#updateButton');
    var $invertButton = $('#invertButton');
    var $clearButton = $('#clearButton');
    var $shiftUpButton = $('#shiftUpButton');
    var $shiftRightButton = $('#shiftRightButton');
    var $shiftDownButton = $('#shiftDownButton');
    var $shiftLeftButton = $('#shiftLeftButton');

    function makeCols8() {
        var out = ['<table class="cols"><tr>'];
        for (var i = 1; i < 9; i++) {
            out.push('<td data-col="' + i + '">' + i + '</td>');
        }
        out.push('</tr></table>');
        return out.join('');
    }

    function makeRows8() {
        var out = ['<table class="rows">'];
        for (var i = 1; i < 9; i++) {
            out.push('<tr><td data-row="' + i + '">' + i + '</td></tr>');
        }
        out.push('</table>');
        return out.join('');
    }

    function makeLeds8x8() {
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

    function makePreview(pattern) {
        pattern = ('0000000000000000' + pattern).substr(-16);

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
    }

    function makePreviewElement(pattern) {
        return $(makePreview(pattern)).click(onPreviewClick);
    }

    function ledsToHex() {
        var out = [];
        for (var i = 1; i < 9; i++) {
            var byte = [];
            for (var j = 1; j < 9; j++) {
                var active = $('.leds td[data-row=' + i + '][data-col=' + j + '] ').hasClass('active');
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

    function hexToLeds() {
        var val = getHexValue();

        for (var i = 1; i < 9; i++) {
            var byte = val.substr(-2 * i, 2);

            byte = parseInt(byte, 16);
            for (var j = 1; j < 9; j++) {
                var active = !!(byte & 1 << (j - 1));
                $('.leds td[data-row=' + i + '][data-col=' + j + '] ').toggleClass('active', active);
            }
        }
    }

    var savedHashState;

    function printArduinoCode(patterns) {
        var out = ['const int PATTERNL = ', patterns.length, ';\n',
            'const uint64_t PATTERNS[PATTERNL] = {\n'];

        for (var i = 0; i < patterns.length; i++) {
            out.push('0x');
            out.push(patterns[i]);

            if (i < patterns.length - 1) {
                if (i % 4 == 3) {
                    out.push(',\n');
                } else {
                    out.push(', ');
                }
            }
        }
        out.push('\n};\n');
        $outputTextarea.val(out.join(''));
    }

    function saveState() {
        var out = [];
        $previews.find('.preview').each(function () {
            out.push($(this).attr('data-hex'));
        });

        window.location.hash = savedHashState = out.join('|');

        printArduinoCode(out);
    }

    function loadState() {
        $previews.empty();
        var preview;
        var patterns = window.location.hash.slice(1).split('|');
        for (var i = 0; i < patterns.length; i++) {
            preview = makePreviewElement(patterns[i]);
            $previews.append(preview);
        }
        preview.addClass('selected');
        $hexInput.val(preview.attr('data-hex'));
        printArduinoCode(patterns);
        hexToLeds();
    }

    function getHexValue() {
        var val = $hexInput.val();
        val = val.replace(/[^0-9a-fA-F]/g, '0');
        val = ('0000000000000000' + val).substr(-16);
        console.log(val);
        return val;
    }

    function onPreviewClick() {
        $hexInput.val($(this).attr('data-hex'));
        processToSave($(this));
        hexToLeds();
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

    $('#cols').append($(makeCols8()));
    $('#rows').append($(makeRows8()));
    $('#leds').append($(makeLeds8x8()));

    $('table.leds td').mousedown(function () {
        $(this).toggleClass('active');
        ledsToHex();
    });

    $invertButton.click(function () {
        $('table.leds td').toggleClass('active');
        ledsToHex();
    });

    $clearButton.click(function () {
        $('table.leds td').removeClass('active');
        ledsToHex();
    });

    $shiftUpButton.click(function () {
        var val = '00' + getHexValue().substr(0, 14);
        $hexInput.val(val);
        hexToLeds();
    });

    $shiftDownButton.click(function () {
        var val = getHexValue().substr(2, 14) + '00';
        $hexInput.val(val);
        hexToLeds();
    });

    $shiftRightButton.click(function () {
        var val = getHexValue();

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
        hexToLeds();
    });

    $shiftLeftButton.click(function () {
        var val = getHexValue();

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
        hexToLeds();
    });

    $('table.cols td').mousedown(function () {
        var col = $(this).attr('data-col');
        $('table.leds td[data-col=' + col + ']').toggleClass('active',
            $('table.leds td[data-col=' + col + '].active').length != 8);
        ledsToHex();
    });

    $('table.rows td[data-row]').mousedown(function () {
        var row = $(this).attr('data-row');
        $('table.leds td[data-row=' + row + ']').toggleClass('active',
            $('table.leds td[data-row=' + row + '].active').length != 8);
        ledsToHex();
    });

    $hexInput.keyup(function () {
        hexToLeds();
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

        hexToLeds();
    });

    $insertButton.click(function () {
        var $newPreview = makePreviewElement($hexInput.val());
        var $selectedPreview = $previews.find('.preview.selected').first();

        if ($selectedPreview.length) {
            $selectedPreview.after($newPreview);
        } else {
            $previews.append($newPreview);
        }

        processToSave($newPreview);
    });

    $updateButton.click(function () {
        var $newPreview = makePreviewElement($hexInput.val());
        var $selectedPreview = $previews.find('.preview.selected').first();

        if ($selectedPreview.length) {
            $selectedPreview.replaceWith($newPreview);
        } else {
            $previews.append($newPreview);
        }

        processToSave($newPreview);
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
