String.prototype.replaceAll = function(find,replace) { return this.split(find).join(replace); }

var system = {};        // system general
var events = {};        // terminal update functions
var environment = {};   // environment variables
var commands = {};      // exposed commands
var elements = {}       // DOM elements to reference
var methods = {};       // helpful methods
var constants = {};     // helpful system constants

constants.terminalStyleTags = {};
constants.terminalStyleTags["D"] = "terminal-style-default";
constants.terminalStyleTags["H"] = "terminal-style-header";
constants.terminalStyleTags["E"] = "terminal-style-error";
constants.terminalStyleTags["r"] = "terminal-style-rainbow";

// [ class Duration <string> ] Formats a string in the form of "<number><ms/s/m/h/d/w/y>" to a proper duration object with universal conversion methods.
constants.durationUnits = {ms:1,s:1000,m:60000,h:3600000,d:86400000,w:604800000,y:31556736000};
class Duration {
    constructor(timeString) {
        this.scalar = parseFloat(timeString);
        this.unit   = timeString.replaceAll(this.scalar,"");
        if (constants.durationUnits[this.unit] == null) {
            throw new Error("Invalid unit");
        }
    }
    getms() { return this.scalar * constants.durationUnits[this.unit]; }
    get() { return this.getms(); }
}

// [ method getRealtextWidth <string> ] Returns the real size in pixels of a text string.
methods.getRealtextWidth = function(text) {
    var tempTextElement = document.createElement("span");
    tempTextElement.innerText = text;
    document.body.appendChild(tempTextElement);
    var textWidth = tempTextElement.getBoundingClientRect().width;
    tempTextElement.remove();
    return textWidth;
}

// [ interval blinkCaret ] Updates the visibility of the caret element on the page.
constants.caretValues = {true:"_",false:"&nbsp;"};
events.blinkCaret = function() {
    system.CaretOn = !system.CaretOn;
    elements.caret.innerHTML = constants.caretValues[system.CaretOn];
}

// [ window.keydown focusInput ] Called on key press, forces the input focus to the input element.
events.focusInput = function(event) {
    if (!["OS","Shift"].includes(event.key) && !event.ctrlKey && !event.altKey) { elements.input.focus(); }
}

// [ input.input resizeInput ] Called on value input, resizes the input element to the real size in pixels of the content.
events.resizeInput = function(event) {
    elements.input.style.width = methods.getRealtextWidth(elements.input.value) + "px";
}

// [ input.keydown preventArrowKeys ] Prevents arrow key presses.
events.preventArrowKeys = function(event) {
    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) { event.preventDefault(); }
}

// [ window.keydown resetCaretBlink ] Called on key press, this resets the caret blink timer.
events.resetCaretBlink = function(event) {
    system.resetCaret();
}

// [ window.keydown enterPress ] Called on enter key press.
events.enterPress = function(event) {
    if (event.key=="Enter") {
        var inputValue = elements.input.value;
        system.clearInputLine();
        system.execute(inputValue);
        system.printLine();
        system.printInputLine();
    }
}

// [ * preventEvent ] Cancels this event.
events.preventEvent = function(event) {
    event.preventDefault();
}

/* builtin commands */
commands["echo"] = function(args) {
    var output = args.slice(1).join(" ");
    system.printLine(output);
    return 0;
}
commands["help"] = function(args) {
    system.printLine("#Hecho#D - prints the given text.");
    system.printLine("#Hhelp#D - displays this help menu.");
    system.printLine("#Hset#D  - sets an environment variable to a given value.");
    system.printLine("#Hget#D  - prints the value of an environment variable.");
    return 0;
}
commands["set"] = function(args) {
    if (args.length <= 2) { system.throwError("not enough parameters."); return 1; }
    var varName = args[1].toLowerCase();
    var varValue = args.slice(2).join(" ");
    environment[varName] = varValue;
    return 0;
}
commands["get"] = function(args) {
    if (args.length <= 1) { system.throwError("not enough parameters."); return 1; }
    var varName = args[1].toLowerCase();
    var varValue = (environment[varName]==null) ? "" : environment[varName];
    system.printLine("#H"+varName+"#D="+varValue);
    return 0;
}

// [ resetCaret ] Resets the caret.
system.resetCaret = function() {
    system.CaretOn = true;
    if (elements.caret) { elements.caret.innerHTML = constants.caretValues[system.CaretOn]; }
    if (system.CaretIntervalObject != null) { window.clearInterval(system.CaretIntervalObject); }
    var blinkDuration = new Duration(environment["caretblinkrate"]);
    system.CaretIntervalObject = window.setInterval(events.blinkCaret, blinkDuration.getms());
}

// [ execute ] Executes a command.
system.execute = function(command) {
    var args = command.split(" ");
    var commandName = args[0];
    if (commands[commandName]) {
        commands[commandName](args);
    } else {
        system.throwError("\'"+commandName+"\' is not a known command.");
    }
}

// [ throwError ] Executes a command.
system.throwError = function(message) {
    system.printLine("#Eerror#D: "+message);
    return 1;
}

// [ printLine ] Prints a line of text to the output.
system.printLine = function(text) {
    if (text == null) { text = ""; }
    if (text.charAt(0)!="#") { text = "#D"+text; }
    var terminalLine = document.createElement("terminal-line");
    var splitText = text.split("#");
    var stylearray = [];
    for (var i=1; i<splitText.length; i++) {
        var styleTagName = constants.terminalStyleTags[splitText[i].charAt(0)];
        var styleTagText = splitText[i].slice(1);
        var styleTagElement = document.createElement(styleTagName);
        styleTagElement.textContent = styleTagText;
        if (styleTagText=="") { styleTagElement.innerHTML = "&nbsp;"; }
        terminalLine.appendChild(styleTagElement);
    }
    document.body.appendChild(terminalLine);
    system.scrollToEnd();
}

// [ clearInputLine ] Clears the input line.
system.clearInputLine = function() {
    if (elements.input) {
        var fullText = "ast3r.in>"+elements.input.value;
        var terminalLine = elements.caret.parentElement;
        if (elements.input) {elements.input.remove();}
        if (elements.caret) {elements.caret.remove();}
        terminalLine.remove();
        system.printLine(fullText);
    }
    if (elements.caret) {
        system.resetCaret();
    }
}

// [ printInputLine ] Prints the input line.
system.printInputLine = function() {
    var terminalLine = document.createElement("terminal-line");
    var terminalText = document.createElement("terminal-style-default");
    terminalText.innerHTML = "ast3r.in&gt;";
    elements.input = document.createElement("input");
    elements.input.value = "";
    elements.input.addEventListener("input", events.resizeInput);
    elements.input.addEventListener("keydown", events.preventArrowKeys);
    elements.input.addEventListener("click", events.preventEvent);
    events.resizeInput();
    elements.caret = document.createElement("terminal-caret");
    elements.caret.innerHTML = "_";
    terminalLine.appendChild(terminalText);
    terminalLine.appendChild(elements.input);
    terminalLine.appendChild(elements.caret);
    document.body.appendChild(terminalLine);
    system.resetCaret();
    system.scrollToEnd();
}

// [ scrollToEnd ] Scrolls to the end of the page
system.scrollToEnd = function() {
    window.scrollTo(0, document.body.scrollHeight);
}

/* System initialization */
system.initialize = function() {
    environment["caretblinkrate"] = "300ms";
    
    system.resetCaret();
    
    system.printLine("#Haster's website :3");
    system.printLine("i havent done much of anything yet but here this is for now :3");
    system.printLine();
    system.printInputLine();
    
    window.addEventListener("keydown", events.focusInput);
    window.addEventListener("keydown", events.resetCaretBlink);
    window.addEventListener("keydown", events.enterPress);
    elements.input.addEventListener("input", events.resizeInput);
    elements.input.addEventListener("keydown", events.preventArrowKeys);
    elements.input.addEventListener("click", events.preventEvent);
    
    events.resizeInput();
}

system.initialize();
