String.prototype.replaceAll = function(find,replace) { return this.split(find).join(replace); }

var system = {};        // system general
var eventhandlers = {}; // terminal update functions
var environment = {};   // environment variables
var commands = {};      // exposed commands
var elements = {}       // DOM elements to reference
var methods = {};       // helpful methods
var constants = {};     // helpful system constants

const terminalStyleTags = {};
terminalStyleTags["D"] = "terminal-style-default";
terminalStyleTags["H"] = "terminal-style-header";
terminalStyleTags["E"] = "terminal-style-error";
terminalStyleTags["r"] = "terminal-style-rainbow";

// [ class Duration <string> ] Formats a string in the form of "<number><ms/s/m/h/d/w/y>" to a proper duration object with universal conversion methods.
constants.durationunits = {ms:1,s:1000,m:60000,h:3600000,d:86400000,w:604800000,y:31556736000};
class Duration {
    constructor(timestring) {
        this.scalar = parseFloat(timestring);
        this.unit   = timestring.replaceAll(this.scalar,"");
        if (constants.durationunits[this.unit] == null) {
            throw new Error("Invalid unit");
        }
    }
    // gets current duration in milliseconds.
    getms() { return this.scalar * constants.durationunits[this.unit]; }
    // default get method, returns milliseconds.
    get() { return this.getms(); }
}

// [ method getrealtextwidth <string> ] Returns the real size in pixels of a text string.
methods.getrealtextwidth = function(text) {
    var temptextelement = document.createElement("span");
    temptextelement.innerText = text;
    document.body.appendChild(temptextelement);
    var textwidth = temptextelement.getBoundingClientRect().width;
    temptextelement.remove();
    return textwidth;
}

// [ interval blinkcaret ] Updates the visibility of the caret element on the page.
constants.caretvalues = {true:"_",false:"&nbsp;"};
eventhandlers.blinkcaret = function() {
    system.CaretOn = !system.CaretOn;
    elements.caret.innerHTML = constants.caretvalues[system.CaretOn];
}

// [ window.keydown focusinput ] Called on key press, forces the input focus to the input element.
eventhandlers.focusinput = function(event) {
    console.log(event);
    if (!["OS","Shift"].includes(event.key) && !event.ctrlKey && !event.altKey) { elements.input.focus(); }
}

// [ input.input resizeinput ] Called on value input, resizes the input element to the real size in pixels of the content.
eventhandlers.resizeinput = function(event) {
    elements.input.style.width = methods.getrealtextwidth(elements.input.value) + "px";
}

// [ window.keydown resetcaretblink ] Called on key press, this resets the caret blink timer.
eventhandlers.resetcaretblink = function(event) {
    system.resetcaret();
}

// [ window.keydown enterpress ] Called on enter key press.
eventhandlers.enterpress = function(event) {
    if (event.key=="Enter") {
        var inputvalue = elements.input.value;
        system.clearInputLine();
        system.execute(inputvalue);
        system.printLine();
        system.printInputLine();
    }
}

// [ *.keydown preventarrowkeys ] Prevents arrow key presses.
eventhandlers.preventarrowkeys = function(event) {
    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) { event.preventDefault(); }
}

// [ * preventevent ] Cancels this event.
eventhandlers.preventevent = function(event) {
    event.preventDefault();
}

// [ resetcaret ] Resets the caret.
system.resetcaret = function(on) {
    system.CaretOn = (on!=null) ? on : true;
    elements.caret.innerHTML = constants.caretvalues[system.CaretOn];
    window.clearInterval(system.CaretIntervalObject);
    system.CaretIntervalObject = null;
    var blinkduration = new Duration(environment.caretblinkrate);
    system.CaretIntervalObject = window.setInterval(eventhandlers.blinkcaret, blinkduration.getms());
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
    var varname = args[1].toLowerCase();
    var varvalue = args.slice(2).join(" ");
    environment[varname] = varvalue;
    return 0;
}
commands["get"] = function(args) {
    if (args.length <= 1) { system.throwError("not enough parameters."); return 1; }
    var varname = args[1].toLowerCase();
    var varvalue = (environment[varname]==null) ? "" : environment[varname];
    system.printLine("#H"+varname+"#D="+varvalue);
    return 0;
}

system.throwError = function(message) {
    system.printLine("#Eerror#D: "+message);
    return 1;
}


// [ printline ] Prints a line of text to the output.
system.printLine = function(text) {
    if (text == null) { text = ""; }
    if (text.charAt(0)!="#") { text = "#D"+text; }
    var terminalline = document.createElement("terminal-line");
    var splittext = text.split("#");
    var stylearray = [];
    for (var i=1; i<splittext.length; i++) {
        var styletagname = terminalStyleTags[splittext[i].charAt(0)];
        var styletagtext = splittext[i].slice(1);
        var styletagelement = document.createElement(styletagname);
        styletagelement.textContent = styletagtext;
        if (styletagtext=="") { styletagelement.innerHTML = "&nbsp;"; }
        terminalline.appendChild(styletagelement);
    }
    document.body.appendChild(terminalline);
}
// [ printline ] Clears the a line of text to the output.
system.clearInputLine = function() {
    if (elements.input) {
        var fullText = "ast3r.in>"+elements.input.value;
        var terminalline = elements.caret.parentElement;
        if (elements.input) {elements.input.remove();}
        if (elements.caret) {elements.caret.remove();}
        terminalline.remove();
        system.printLine(fullText);
    }
    if (elements.caret) {
        system.resetcaret();
    }
}
system.printInputLine = function() {
    var terminalline = document.createElement("terminal-line");
    var terminaltext = document.createElement("terminal-style-default");
    terminaltext.innerHTML = "ast3r.in&gt;";
    elements.input = document.createElement("input");
    elements.input.value = "";
    elements.input.addEventListener("input", eventhandlers.resizeinput);
    elements.input.addEventListener("keydown", eventhandlers.preventarrowkeys);
    elements.input.addEventListener("click", eventhandlers.preventevent);
    eventhandlers.resizeinput();
    elements.caret = document.createElement("terminal-caret");
    elements.caret.innerHTML = "_";
    terminalline.appendChild(terminaltext);
    terminalline.appendChild(elements.input);
    terminalline.appendChild(elements.caret);
    document.body.appendChild(terminalline);
    system.resetcaret();
}

/* System initialization */
system.initialize = function() {
    environment.caretblinkrate = "300ms";
    
    var blinkduration = new Duration(environment.caretblinkrate);
    system.CaretIntervalObject = window.setInterval(eventhandlers.blinkcaret, blinkduration.getms());
    system.CaretOn = true;
    
    system.printLine("#Haster's website :3");
    system.printLine("i havent done much of anything yet but here this is for now :3");
    system.printLine();
    system.printInputLine();
    
    elements.input.value = "";
    
    window.addEventListener("keydown", eventhandlers.focusinput);
    window.addEventListener("keydown", eventhandlers.resetcaretblink);
    window.addEventListener("keydown", eventhandlers.enterpress);
    elements.input.addEventListener("input", eventhandlers.resizeinput);
    elements.input.addEventListener("keydown", eventhandlers.preventarrowkeys);
    elements.input.addEventListener("click", eventhandlers.preventevent);
    
    eventhandlers.resizeinput();
}

system.initialize();
