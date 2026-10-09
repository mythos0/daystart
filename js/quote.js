/* DayStart — quote.js
   Quote / mantra of the day — deterministic daily pick from a curated
   local collection. No network calls, fully offline & private. */

const Quote = (() => {
  const QUOTES = [
    ["The secret of getting ahead is getting started.", "Mark Twain"],
    ["Well begun is half done.", "Aristotle"],
    ["Action is the foundational key to all success.", "Pablo Picasso"],
    ["Focus on being productive instead of busy.", "Tim Ferriss"],
    ["It always seems impossible until it is done.", "Nelson Mandela"],
    ["The best way to predict the future is to create it.", "Peter Drucker"],
    ["Simplicity is the ultimate sophistication.", "Leonardo da Vinci"],
    ["What we do every day matters more than what we do once in a while.", "Gretchen Rubin"],
    ["Amateurs sit and wait for inspiration. The rest of us just get up and go to work.", "Stephen King"],
    ["You do not rise to the level of your goals. You fall to the level of your systems.", "James Clear"],
    ["Nothing is less productive than to make more efficient what should not be done at all.", "Peter Drucker"],
    ["Discipline is choosing between what you want now and what you want most.", "Abraham Lincoln"],
    ["The successful warrior is the average person with laser-like focus.", "Bruce Lee"],
    ["Do the hard jobs first. The easy jobs will take care of themselves.", "Dale Carnegie"],
    ["Great things are not done by impulse, but by a series of small things brought together.", "Vincent van Gogh"],
    ["How we spend our days is, of course, how we spend our lives.", "Annie Dillard"],
    ["A year from now you may wish you had started today.", "Karen Lamb"],
    ["Done is better than perfect.", "Sheryl Sandberg"],
    ["Slow is smooth, smooth is fast.", "Proverb"],
    ["Start where you are. Use what you have. Do what you can.", "Arthur Ashe"],
    ["Little by little, one travels far.", "J. R. R. Tolkien"],
    ["The journey of a thousand miles begins with one step.", "Lao Tzu"],
    ["Either you run the day or the day runs you.", "Jim Rohn"],
    ["If you want to conquer the anxiety of life, live in the moment.", "Amit Ray"],
    ["Calm mind brings inner strength and self-confidence.", "Dalai Lama"],
    ["Between stimulus and response there is a space. In that space is our power to choose.", "Viktor Frankl"],
    ["What you get by achieving your goals is not as important as what you become.", "Zig Ziglar"],
    ["Perfection is not attainable, but if we chase perfection we can catch excellence.", "Vince Lombardi"],
    ["The only way to do great work is to love what you do.", "Steve Jobs"],
    ["Motivation gets you going, but discipline keeps you growing.", "John C. Maxwell"]
  ];

  function pickOfDay() {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return QUOTES[dayOfYear % QUOTES.length];
  }

  function render() {
    const [text, author] = pickOfDay();
    document.getElementById("quote-text").textContent = "\u201C" + text + "\u201D";
    document.getElementById("quote-author").textContent = "\u2014 " + author;
  }

  return { init: render };
})();
