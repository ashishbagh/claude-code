# Narration – LeetCode 200 Number of Islands

Event timings are fractions of the scene length (clip + 0.7 s).

## English (Daniel – Steady Broadcaster, `onwK4e9ZLuTAKqWW03F9`, eleven_v4)

1. Let's solve LeetCode two hundred: Number of Islands. We're given a grid of ones and zeros. Ones are land, and zeros are water. An island is a group of land cells connected up, down, left, or right. Our job is to count how many islands there are.
   *title 0–4 s · grid 4.4 s · legend 5.5 s · 4-direction diagram 0.52 · goal caption 0.82*
2. The key idea is simple. We scan every cell, row by row. Whenever we find land that we haven't visited yet, we've discovered a brand new island. So we add one to our count, and then run a depth first search from that cell, sinking every connected piece of land, so it never gets counted again.
   *cards at 0.10 / 0.33 / 0.58 / 0.82*
3. Let's walk through it. We start scanning at the top left corner. It's land! Our island count becomes one. Now the depth first search spreads out to every connected land cell, to the right, then down, and around, sinking all four cells of this island.
   *found 0.27 · sinking 0.47 + 0.09 per cell*
4. We keep scanning. Water and sunken cells are simply skipped. At row two, column two, we find fresh land. The count becomes two. This cell has no land neighbors, so the search stops right there.
   *scan 0.08–0.48 · found 0.5 · sink 0.66*
5. Scanning on, row three, column three is land. The count becomes three. The search spreads to the right and sinks its neighbor. The rest of the grid is water, so the scan finishes. The answer is three islands.
   *found 0.22 · sink 0.42 + 0.13 · scan rest 0.68–0.8 · answer 0.84*
6. Here's the code. We loop over every cell. If it's land, we increment the count and call D F S. Inside D F S, we return if we're out of bounds or standing on water. Otherwise, we mark the cell as water, and recurse in all four directions.
   *highlight loops 0–0.22 · if/count/dfs 0.22–0.47 · bounds 0.47–0.70 · sink+recurse 0.70–1*
7. Every cell is visited only a constant number of times, so the time complexity is O of m times n. In the worst case, the recursion stack can grow as large as the grid, so space is also O of m times n. And that's Number of Islands. Thanks for watching!
   *time card 0.05 · space card 0.42 · outro 0.8*

## Hinglish (Prashant – Warm, Clear Hindi Explainer, `j7yQHuKNC1hdt1LBPAks`, eleven_v4)

1. चलो solve करते हैं LeetCode two hundred, Number of Islands. हमें ones और zeros का एक grid दिया गया है. One मतलब land, और zero मतलब water. Island यानी land cells का ऐसा group, जो up, down, left या right से connected हो. हमें count करना है कि कितने islands हैं.
2. Idea बहुत simple है. हम हर cell को row by row scan करेंगे. जब भी कोई ऐसी land मिले, जो पहले visit नहीं हुई, समझो एक नया island मिल गया. तो count में एक add करो, और उस cell से depth first search चलाओ, जो पूरी connected land को sink कर देगा, ताकि वो दोबारा count न हो.
3. चलो walkthrough करते हैं. Scanning शुरू होती है top left corner से. ये land है! Island count हो गया एक. अब depth first search हर connected land cell तक फैलता है, पहले right, फिर down, और फिर around, और इस island के चारों cells को sink कर देता है.
4. Scanning जारी रखते हैं. Water और sunk cells को simply skip कर देते हैं. Row two, column two पर fresh land मिलती है. Count हो गया दो. इस cell का कोई land neighbor नहीं है, तो search वहीं रुक जाता है.
5. आगे scan करते हैं. Row three, column three पर land है. Count हो गया तीन. Search right की तरफ फैलता है, और उसके neighbor को भी sink कर देता है. बाकी grid में सिर्फ water है, तो scan खत्म. Answer है, तीन islands.
6. अब code देखते हैं. हम हर cell पर loop करते हैं. अगर वो land है, तो count increment करो, और D F S call करो. D F S के अंदर, अगर हम bounds से बाहर हैं, या water पर हैं, तो return कर दो. वरना cell को water mark करो, और चारों directions में recurse करो.
7. हर cell को सिर्फ constant number of times visit किया जाता है, इसलिए time complexity है, O of m times n. Worst case में recursion stack पूरे grid जितना बड़ा हो सकता है, तो space भी O of m times n है. तो ये था Number of Islands. देखने के लिए धन्यवाद!
