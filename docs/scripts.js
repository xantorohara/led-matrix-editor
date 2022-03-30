$(function () {
    var $body = $('body');
    var $frames = $('#frames');
    var $hexInput = $('#hex-input');
    var $insertButton = $('#insert-button');
    var $deleteButton = $('#delete-button');
    var $updateButton = $('#update-button');

    var $leds, $cols, $rows;

    function Bitmap(hexString) {
        let matrix = fromHexString(hexString);

        function fromHexString(hexString) {
            const out = [];
            for (let i = 0; i < hexString.length / 2; i++) {
                let byte = parseInt(hexString.substr(i * 2, 2), 16).toString(2);
                byte = ('00000000' + byte).substr(-8);
                out.push(byte.split('').reverse());
            }
            return out.reverse();
        }

        function toHexString() {
            const out = [];
            for (let i = 0; i < matrix.length; i++) {
                let byte = parseInt(matrix[i].slice().reverse().join(''), 2).toString(16);
                byte = ('0' + byte).substr(-2);
                out.push(byte);
            }
            return out.reverse().join('');
        }

        function transpose() {
            for (let i = 0; i < matrix.length; i++) {
                for (let j = i; j < 8; j++) {
                    const tmp = matrix[i][j];
                    matrix[i][j] = matrix[j][i];
                    matrix[j][i] = tmp;
                }
            }
        }

        function shiftLeft() {
            for (let i = 0; i < matrix.length; i++) {
                const len = matrix[i].length - 1;
                for (let j = 0; j < len; j++) {
                    matrix[i][j] = matrix[i][j + 1];
                }
                matrix[i][len] = 0;
            }
        }

        function shiftRight() {
            for (let i = 0; i < matrix.length; i++) {
                const len = matrix[i].length - 1;
                for (let j = len; j > 0; j--) {
                    matrix[i][j] = matrix[i][j - 1];
                }
                matrix[i][0] = 0;
            }
        }

        function rotate() {
            matrix.reverse();
            transpose();
        }

        function rotateBack() {
            transpose();
            matrix.reverse();
        }

        return {
            toHexString: toHexString,
            shiftLeft: shiftLeft,
            shiftRight: shiftRight,
            rotate: rotate,
            rotateBack: rotateBack,
        }
    }

    var generator = {
        tableCols: function () {
            var out = ['<table id="cols-list"><tr>'];
            for (var i = 1; i < 9; i++) {
                out.push('<td class="item" data-col="' + i + '">' + i + '</td>');
            }
            out.push('</tr></table>');
            return out.join('');
        },
        tableRows: function () {
            var out = ['<table id="rows-list">'];
            for (var i = 1; i < 9; i++) {
                out.push('<tr><td class="item" data-row="' + i + '">' + i + '</td></tr>');
            }
            out.push('</table>');
            return out.join('');
        },
        tableLeds: function () {
            var out = ['<table id="leds-matrix">'];
            for (var i = 1; i < 9; i++) {
                out.push('<tr>');
                for (var j = 1; j < 9; j++) {
                    out.push('<td class="item" data-row="' + i + '" data-col="' + j + '"></td>');
                }
                out.push('</tr>');
            }
            out.push('</table>');
            return out.join('');
        }
    };

    var converter = {
        patternToFrame: function (pattern) {
            var out = ['<table class="frame" data-hex="' + pattern + '">'];
            for (var i = 1; i < 9; i++) {
                var byte = pattern.substr(-2 * i, 2);
                byte = parseInt(byte, 16);

                out.push('<tr>');
                for (var j = 0; j < 8; j++) {
                    if ((byte & 1 << j)) {
                        out.push('<td class="item active"></td>');
                    } else {
                        out.push('<td class="item"></td>');
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
            var out = ['const uint8_t IMAGES[][8] = {\n'];

            for (var i = 0; i < patterns.length; i++) {
                out.push('{\n');
                for (var j = 7; j >= 0; j--) {
                    var byte = patterns[i].substr(2 * j, 2);
                    byte = parseInt(byte, 16).toString(2);
                    byte = ('00000000' + byte).substr(-8);
                    byte = byte.split('').reverse().join('');
                    out.push('  0b');
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

    function makeFrameElement(pattern) {
        pattern = converter.fixPattern(pattern);
        return $(converter.patternToFrame(pattern)).click(onFrameClick);
    }

    function ledsToHex() {
        var out = [];
        for (var i = 1; i < 9; i++) {
            var byte = [];
            for (var j = 1; j < 9; j++) {
                var active = $leds.find('.item[data-row=' + i + '][data-col=' + j + '] ').hasClass('active');
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
                $leds.find('.item[data-row=' + i + '][data-col=' + j + '] ').toggleClass('active', active);
            }
        }
    }

    var savedHashState;

    function printArduinoCode(patterns) {
        if (patterns.length) {
            var code;
            if ($('#images-as-byte-arrays').prop("checked")) {
                code = converter.patternsToCodeBytesArray(patterns);
            } else {
                code = converter.patternsToCodeUint64Array(patterns);
            }
            $('#output').val(code);
        }
    }

    function framesToPatterns() {
        var out = [];
        $frames.find('.frame').each(function () {
            out.push($(this).attr('data-hex'));
        });
        return out;
    }

    function saveState() {
        var patterns = framesToPatterns();
        printArduinoCode(patterns);
        window.location.hash = savedHashState = patterns.join('|');
    }

    function loadState() {
        savedHashState = window.location.hash.slice(1);
        $frames.empty();
        var frame;
        var patterns = savedHashState.split('|');
        patterns = converter.fixPatterns(patterns);

        for (var i = 0; i < patterns.length; i++) {
            frame = makeFrameElement(patterns[i]);
            $frames.append(frame);
        }
        frame.addClass('selected');
        $hexInput.val(frame.attr('data-hex'));
        printArduinoCode(patterns);
        hexInputToLeds();
    }

    function getInputHexValue() {
        return converter.fixPattern($hexInput.val());
    }

    function onFrameClick() {
        $hexInput.val($(this).attr('data-hex'));
        processToSave($(this));
        hexInputToLeds();
    }

    function processToSave($focusToFrame) {
        $frames.find('.frame.selected').removeClass('selected');

        if ($focusToFrame.length) {
            $focusToFrame.addClass('selected');
            $deleteButton.removeAttr('disabled');
            $updateButton.removeAttr('disabled');
        } else {
            $deleteButton.attr('disabled', 'disabled');
            $updateButton.attr('disabled', 'disabled');
        }
        saveState();
    }

    function parseArduinoCode(text) {
        // Matches the uint64_t-based code output (and more)
        const UINT64_REGEX = /const\s+uint64_t\s+(\w+)\s*\[\s*\]\s*=\s*{((?:.|\r|\n)*)}\s*;/;
        // Matches uint8_t/byte-based code output (and more)
        const UINT8_REGEX = /const\s+(?:uint8_t|byte)\s+(\w+)\s*\[\s*\]\s*\[\s*8\s*\]\s*=\s*{((?:.|\r|\n)*)}\s*;/;

        // List of 16 char-long hex strings representing the matrices as they appear in the URL hash
        let matrices;

        let match;
        if (match = UINT64_REGEX.exec(text)) {
            matrices = Array.from(match[2].matchAll(/0x([0-9a-zA-Z]{16})/g)).map(match => match[1]);
        } else if (match = UINT8_REGEX.exec(text)) {
            let bytesStr = Array.from(match[2].matchAll(/(?:0b|0B|B)([01]{8})/g)).map(match => match[1]);
            if (bytesStr.length % 8 !== 0) return null;
            let bytes = bytesStr.map(
                b => parseInt(b.split('').reverse().join(''), 2).toString(16).padStart(2, '0')
            );

            // Split the parsed numbers into groups of 8 elements (each group being a matrix)
            let groups = [];
            while (bytes.length) {
                groups.push(bytes.splice(0, 8));
            }

            matrices = groups.map(g => g.reverse().join(''));
        } else {
            return null;
        }

        return matrices.join('|');
    }

    $('#cols-container').append($(generator.tableCols()));
    $('#rows-container').append($(generator.tableRows()));
    $('#leds-container').append($(generator.tableLeds()));

    $cols = $('#cols-list');
    $rows = $('#rows-list');
    $leds = $('#leds-matrix');

    $leds.find('.item').mousedown(function () {
        $(this).toggleClass('active');
        ledsToHex();
    });

    $('#invert-button').click(function () {
        $leds.find('.item').toggleClass('active');
        ledsToHex();
    });

    $('#shift-up-button').click(function () {
        var val = '00' + getInputHexValue().substr(0, 14);
        $hexInput.val(val);
        hexInputToLeds();
    });

    $('#shift-down-button').click(function () {
        var val = getInputHexValue().substr(2, 14) + '00';
        $hexInput.val(val);
        hexInputToLeds();
    });

    $('#shift-right-button').click(function () {
        const bitmap = Bitmap(getInputHexValue());
        bitmap.shiftRight();
        $hexInput.val(bitmap.toHexString());
        hexInputToLeds();
    });

    $('#shift-left-button').click(function () {
        const bitmap = Bitmap(getInputHexValue());
        bitmap.shiftLeft();
        $hexInput.val(bitmap.toHexString());
        hexInputToLeds();
    });


    $('#rotate-button').click(function () {
        const bitmap = Bitmap(getInputHexValue());
        bitmap.rotate();
        $hexInput.val(bitmap.toHexString());
        hexInputToLeds();
    });

    $('#rotate-back-button').click(function () {
        const bitmap = Bitmap(getInputHexValue());
        bitmap.rotateBack();
        $hexInput.val(bitmap.toHexString());
        hexInputToLeds();
    });

    $cols.find('.item').mousedown(function () {
        var col = $(this).attr('data-col');
        $leds.find('.item[data-col=' + col + ']').toggleClass('active',
            $leds.find('.item[data-col=' + col + '].active').length != 8);
        ledsToHex();
    });

    $rows.find('.item').mousedown(function () {
        var row = $(this).attr('data-row');
        $leds.find('.item[data-row=' + row + ']').toggleClass('active',
            $leds.find('.item[data-row=' + row + '].active').length != 8);
        ledsToHex();
    });

    $hexInput.keyup(function () {
        hexInputToLeds();
    });

    $deleteButton.click(function () {
        var $selectedFrame = $frames.find('.frame.selected').first();
        var $nextFrame = $selectedFrame.next('.frame').first();

        if (!$nextFrame.length) {
            $nextFrame = $selectedFrame.prev('.frame').first();
        }

        $selectedFrame.remove();

        if ($nextFrame.length) {
            $hexInput.val($nextFrame.attr('data-hex'));
        }

        processToSave($nextFrame);

        hexInputToLeds();
    });

    $insertButton.click(function () {
        var $newFrame = makeFrameElement(getInputHexValue());
        var $selectedFrame = $frames.find('.frame.selected').first();

        if ($selectedFrame.length) {
            $selectedFrame.after($newFrame);
        } else {
            $frames.append($newFrame);
        }

        processToSave($newFrame);
    });

    $updateButton.click(function () {
        var $newFrame = makeFrameElement(getInputHexValue());
        var $selectedFrame = $frames.find('.frame.selected').first();

        if ($selectedFrame.length) {
            $selectedFrame.replaceWith($newFrame);
        } else {
            $frames.append($newFrame);
        }

        processToSave($newFrame);
    });

    $('#images-as-byte-arrays').change(function () {
        var patterns = framesToPatterns();
        printArduinoCode(patterns);
    });


    $('#matrix-toggle').hover(function () {
        $cols.find('.item').addClass('hover');
        $rows.find('.item').addClass('hover');
    }, function () {
        $cols.find('.item').removeClass('hover');
        $rows.find('.item').removeClass('hover');
    });

    $('#matrix-toggle').mousedown(function () {
        var col = $(this).attr('data-col');
        $leds.find('.item').toggleClass('active', $leds.find('.item.active').length != 64);
        ledsToHex();
    });

    $('#output').on('paste', function (e) {
        var value = e.originalEvent.clipboardData.getData('text');

        const hash = parseArduinoCode(value);
        if (hash) {
            location.hash = hash;
        } else {
            alert("Couldn't parse pasted code as valid LED Matrix Editor-generated C ;(");
        }
    });

    $('#output').focus(function() {
        $(this).select();
    });

    $('#circuit-theme').click(function () {
        if ($body.hasClass('circuit-theme')) {
            $body.removeClass('circuit-theme');
            Cookies.set('page-theme', 'plain-theme', {path: ''});
        } else {
            $body.addClass('circuit-theme');
            Cookies.set('page-theme', 'circuit-theme', {path: ''});
        }
    });

    $('.leds-case').click(function () {
        var themeName = $(this).attr('data-leds-theme');
        setLedsTheme(themeName);
        Cookies.set('leds-theme', themeName, {path: ''});
    });

    function setLedsTheme(themeName) {
        $body.removeClass('red-leds yellow-leds green-leds blue-leds white-leds').addClass(themeName);
    }

    function setPageTheme(themeName) {
        $body.removeClass('plain-theme circuit-theme').addClass(themeName);
    }

    var playInterval;

    $('#play-button').click(function () {
        if (playInterval) {
            $('#play-button-stop').hide();
            $('#play-button-play').show();
            clearInterval(playInterval);
            playInterval = null;
        } else {
            $('#play-button-stop').show();
            $('#play-button-play').hide();

            playInterval = setInterval(function () {
                var $selectedFrame = $frames.find('.frame.selected').first();
                var $nextFrame = $selectedFrame.next('.frame').first();

                if (!$nextFrame.length) {
                    $nextFrame = $frames.find('.frame').first();
                }

                if ($nextFrame.length) {
                    $hexInput.val($nextFrame.attr('data-hex'));
                }

                processToSave($nextFrame);

                hexInputToLeds();
            }, $('#play-delay-input').val());
        }
    });


    $(window).on('hashchange', function () {
        if (window.location.hash.slice(1) != savedHashState) {
            loadState();
        }
    });

    $frames.sortable({
        stop: function (event, ui) {
            saveState();
        }
    });

    loadState();

    var ledsTheme = Cookies.get('leds-theme');

    if (ledsTheme) {
        setLedsTheme(ledsTheme);
    }

    var pageTheme = Cookies.get('page-theme') || 'circuit-theme';

    setPageTheme(pageTheme);

});
