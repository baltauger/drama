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
  nxtWordIdx: null,
  input: null,
  words: null,
  actions:null,
  rhythms:null,
  isRunning: false,
  timers: [],

  setInput: function(input) {
    this.input = input;
    this.actions = {};
    this.rhythms = {};

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
    var firstWordRegex = /(.+?)(?:[\s]|$)([\s\S]*)/;
    var isMarkupStartRegex = /(<a|<trigger)/;
    var isPassageLinkRegex = /^(?:<a).*(?:data-passage=")(.*?)(?:">)(.*?)<\/a>([\s\S]*)/;
    var isDramaNoteRegex = /<trigger class="(.*)">(.*)<\/trigger>([\s\S]*)/;

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
            //wordIndex++;
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
                this.actions[allWords.length-1] = {action:"showPassage", value:linkPassage};
                //wordIndex++;
                linkWord = firstWordRegex.exec(linkWord[2]);
              }
              firstWord = firstWordRegex.exec(passageLinkData[3]); 
            }
            if(firstWord[0].match(isDramaNoteRegex) != null){
              var dramaNoteData = isDramaNoteRegex.exec(firstWord[0]);
              var dramaWords = dramaNoteData[2];
              var dramaNote = dramaNoteData[1]; //KEEP DEVELOPING THIS !!!
              //....
              var dramaWord = firstWordRegex.exec(dramaWords);
              while (dramaWord != null)
              {
                allWords.push(dramaWord[1]);
                this.actions[allWords.length-1] = {action:"dramaNote", value:dramaNote};
                //wordIndex++;
                dramaWord = firstWordRegex.exec(dramaWord[2]);
              }
              firstWord = firstWordRegex.exec(dramaNoteData[3]);
            }
          }
        }
        console.log(allWords);
        console.log(wordIndex);
    }
    


    //NOTE: "Split on all spaces" is too simplistic for my needs.  I need to work on this particular part of the algorithm to support markup
    // The rest of the processing should only be to adjust the clean, displayable text to the reader
    // Split on spaces
    //var allWords = input.split(/\s+/);

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
        // tmpWords.splice(t+1, 0, allWords[i]);
        // tmpWords.splice(t+1, 0, allWords[i]);
        // t++;
        // t++;
        this.rhythms[i+1] = {note:"pause", value:2};
      }

      // Add an additional space after punctuation.
      if(allWords[i].indexOf('.') != -1 || allWords[i].indexOf('!') != -1 || allWords[i].indexOf('?') != -1 || allWords[i].indexOf(':') != -1 || allWords[i].indexOf(';') != -1|| allWords[i].indexOf(')') != -1){
        // tmpWords.splice(t+1, 0, ".");
        // tmpWords.splice(t+1, 0, ".");
        // tmpWords.splice(t+1, 0, ".");
        // t++;
        // t++;
        // t++;
        this.rhythms[i+1] = {note:"pause", value:3};
      }

      t++;
    }

    this.words = tmpWords.slice(0);
    this.nxtWordIdx = 0;
  },

  setWpm: function(wpm) {
    this.wpm = parseInt(wpm, 10);
    this.msPerWord = 60000/wpm;
  },

  start: function() {
    this.isRunning = true;

    thisObj = this;

    this.timers.push(setTimeout(function() {
      thisObj.displayWordAndIncrement();
    }, this.msPerWord));

    // this.$container.mousedown(function(){
    // thisObj.navigateIntent();
  // });
  },

  stop: function() {
    this.isRunning = false;

    for(var i = 0; i < this.timers.length; i++) {
      clearTimeout(this.timers[i]);
    }
  },

  displayWordAndIncrement: function() {
    var pivotedWord = pivot(this.words[this.nxtWordIdx]);

    //this.$container.html(pivotedWord);
    this.$dramaStart.html(pivotedWord[0]);
    this.$dramaPivot.html(pivotedWord[1]);
    this.$dramaEnd.html(pivotedWord[2]);

    //run action
    if (this.actions[this.nxtWordIdx] != null)
    {
      var dramaNoteAction = this.actions[this.nxtWordIdx];
      if (dramaNoteAction.action == "dramaNote")
      {
        window.triggers[dramaNoteAction.value]();
      }
      if (dramaNoteAction.action == "showPassage")
      {
        this.$dramaStart.addClass('drama_link');
        this.$dramaPivot.addClass('drama_link');
        this.$dramaEnd.addClass('drama_link');
      }
    }
    else {
      this.$dramaStart.removeClass('drama_link');
      this.$dramaPivot.removeClass('drama_link');
      this.$dramaEnd.removeClass('drama_link');
    }

    this.nxtWordIdx++;
    if (thisObj.nxtWordIdx >= thisObj.words.length) {
      this.nxtWordIdx = 0;
      this.stop();
      if(typeof(this.afterDoneCallback) === 'function') {
        this.afterDoneCallback();
      }
    }
    else {
      
      if(this.rhythms[this.nxtWordIdx] != null) {
        var rhythmNote = this.rhythms[this.nxtWordIdx];
        if (rhythmNote.note == "pause")
        {
          this.timers.push(setTimeout(function() {
            thisObj.displayWordAndIncrement();
          }, this.msPerWord * rhythmNote.value));   
        }
      }
      else {
        this.timers.push(setTimeout(function() {
          thisObj.displayWordAndIncrement();
        }, this.msPerWord)); 
      }
    }
  },

  navigateIntent: function() {

    if(this.actions == null) return null;

    if (this.actions[this.nxtWordIdx-1] != null)
    {
      var navigationAction = this.actions[this.nxtWordIdx-1];
      if (navigationAction.action == "showPassage")
      {
        return (navigationAction.value);
      }
    }
    else
        return null;
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

        var tail = 22 - (word.length + 7);
        word = '.......' + word + ('.'.repeat(tail));

        var start = word.slice(0, word.length/2);
        var end = word.slice(word.length/2, word.length);

        var result = [];
        result.push(start.slice(0, start.length -1));
        result.push(start.slice(start.length-1, start.length));
        result.push(end);

    }

    result.forEach(function(item,index,array){
      array[index] = array[index].replace(/\./g, "<span class='invisible'>.</span>")
    });

    return result;
}

// Let strings repeat themselves,
// because JavaScript isn't as awesome as Python.
/*String.prototype.repeat = function( num ){
    return new Array( num + 1 ).join( this );
}
*/
module.exports = DramaReader;
