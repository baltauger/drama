var DramaReader = function(container){
  this.$container = $(container);
  this.$dramaStart = $("<span class='drama_start'></span>").appendTo(this.$container);
  this.$dramaPivot = $("<span class='drama_pivot'></span>").appendTo(this.$container);
  this.$dramaEnd = $("<span class='drama_end'></span>").appendTo(this.$container);
};
DramaReader.prototype = {
  afterDoneCallback: null,
  wpm: null,
  msPerWord: null,
  wordIdx: null,
  input: null,
  words: null,
  actions:null,
  isRunning: false,
  timers: [],

  setInput: function(input) {
    this.input = input;
    this.actions = {};

    var paragraphRegex = /(?:<p>)([\s\S]*?)(?:<\/p>)/g;
    var paragraph = paragraphRegex.exec(input);
    var inputParagraphs = [];
    
    while (paragraph != null)
    {
      inputParagraphs.push(paragraph[1]);
      paragraph = paragraphRegex.exec(input);
    }

    console.log(inputParagraphs);

    //for each paragraph, extract the data about the hyperlink words and where they should go

    var allWords = [];
    var wordIndex = 0;
    var firstWordRegex = /^(.+?)(?:[\s]|$)([\s\S]*)/;
    var isMarkupStartRegex = /<a/;
    var isPassageLinkRegex = /^(?:<a).*(?:data-passage=")(.*?)(?:">)(.*?)<\/a>([\s\S]*)/;

    for (paragraphIdx in inputParagraphs)
    {
      //let's do a cautious split, one "word" at a time. This should give us the capability to react to certain opening markup
      var firstWord = firstWordRegex.exec(inputParagraphs[paragraphIdx]);

      while (firstWord != null)
        {
          if (firstWord[1].match(isMarkupStartRegex) == null)
          {
            //it's just a word.
            allWords.push(firstWord[1]);
            wordIndex++;
            firstWord = firstWordRegex.exec(firstWord[2]);
          }
          else
          {
            console.log("markup found! do something!");
            //get the type of markup
            if(firstWord[0].match(isPassageLinkRegex) != null)
            {
              var passageLinkData = isPassageLinkRegex.exec(firstWord[0]);
              var linkWords = passageLinkData[2];
              var linkPassage = passageLinkData[1];

              var linkWord = firstWordRegex.exec(linkWords);
              while (linkWord != null)
              {
                allWords.push(linkWord[1]);
                wordIndex++;
                this.actions[wordIndex] = {action:"showPassage", value:linkPassage};
                linkWord = firstWordRegex.exec(linkWord[2]);
              }
              firstWord = firstWordRegex.exec(passageLinkData[3]); 
              //TODO current sample fails here because the string ends up starting with that nasty newline character :(( )
            }
          }
        }
        console.log(allWords);
        console.log(wordIndex);
    }
    


    //NOTE: "Split on all spaces" is too simplistic for my needs.  I need to work on this particular part of the algorithm to support markup
    // The rest of the processing should only be to adjust the clean, displayable text to the reader
    // Split on spaces
    var allWords = input.split(/\s+/);

    var word = '';
    var result = '';

    // Preprocess words
    var tmpWords = allWords.slice(0); // copy Array
    var t = 0;

    for (var i=0; i<allWords.length; i++){

      if(allWords[i].indexOf('.') != -1){
        tmpWords[t] = allWords[i].replace('.', '•');
      }

      // Double up on long words and words with commas.
      if((allWords[i].indexOf(',') != -1 || allWords[i].indexOf(':') != -1 || allWords[i].indexOf('-') != -1 || allWords[i].indexOf('(') != -1|| allWords[i].length > 8) && allWords[i].indexOf('.') == -1){
        tmpWords.splice(t+1, 0, allWords[i]);
        tmpWords.splice(t+1, 0, allWords[i]);
        t++;
        t++;
      }

      // Add an additional space after punctuation.
      if(allWords[i].indexOf('.') != -1 || allWords[i].indexOf('!') != -1 || allWords[i].indexOf('?') != -1 || allWords[i].indexOf(':') != -1 || allWords[i].indexOf(';') != -1|| allWords[i].indexOf(')') != -1){
        tmpWords.splice(t+1, 0, ".");
        tmpWords.splice(t+1, 0, ".");
        tmpWords.splice(t+1, 0, ".");
        t++;
        t++;
        t++;
      }

      t++;
    }

    this.words = tmpWords.slice(0);
    this.wordIdx = 0;
  },

  setWpm: function(wpm) {
    this.wpm = parseInt(wpm, 10);
    this.msPerWord = 60000/wpm;
  },

  start: function() {
    this.isRunning = true;

    thisObj = this;

    this.timers.push(setInterval(function() {
      thisObj.displayWordAndIncrement();
    }, this.msPerWord));
  },

  stop: function() {
    this.isRunning = false;

    for(var i = 0; i < this.timers.length; i++) {
      clearTimeout(this.timers[i]);
    }
  },

  displayWordAndIncrement: function() {
    var pivotedWord = pivot(this.words[this.wordIdx]);

    //this.$container.html(pivotedWord);
    this.$dramaStart.text(pivotedWord[0]);
    this.$dramaPivot.text(pivotedWord[1]);
    this.$dramaEnd.text(pivotedWord[2]);

    this.wordIdx++;
    if (thisObj.wordIdx >= thisObj.words.length) {
      this.wordIdx = 0;
      this.stop();
      if(typeof(this.afterDoneCallback) === 'function') {
        this.afterDoneCallback();
      }
    }
  }
};

// Find the red-character of the current word.
function pivot(word){
    var length = word.length;

    // Longer words are "right-weighted" for easier readability.
    if(length<6){

        var bit = 1;
        while(word.length < 22){
            if(bit > 0){
                word = word + '.';
            }
            else{
                word = '.' + word;
            }
            bit = bit * -1;
        }

        var start = '';
        var end = '';
        if((length % 2) === 0){
            start = word.slice(0, word.length/2);
            end = word.slice(word.length/2, word.length);
        } else{
            start = word.slice(0, word.length/2);
            end = word.slice(word.length/2, word.length);
        }

        var result = [];
        result.push(start.slice(0, start.length -1));
        result.push(start.slice(start.length-1, start.length));
        result.push(end);
    }

    else{

        word = '.......' + word;

        var tail = 22 - (word.length + 7);
        if(tail > 0) {
          word + ('.'.repeat(tail));
        }

        var start = word.slice(0, word.length/2);
        var end = word.slice(word.length/2, word.length);

        var result = [];
        result.push(start.slice(0, start.length -1));
        result.push(start.slice(start.length-1, start.length));
        result.push(end);

    }

    //result = result.replace(/\./g, "<span class='invisible'>.</span>");

    return result;
}

// Let strings repeat themselves,
// because JavaScript isn't as awesome as Python.
String.prototype.repeat = function( num ){
    return new Array( num + 1 ).join( this );
}

module.exports = DramaReader;
