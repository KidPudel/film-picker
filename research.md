**The strongest opportunity is to help people feel confident that a film fits the evening they want to have.** Across the accounts I reviewed, the difficulty often comes from uncertainty about the experience: *Will this demand too much concentration? Will it upset me? Will we both enjoy it? Is it worth using tonight’s limited time?*

Your words—**clarity, experience, and vibe**—are useful starting points. The research suggests making them concrete: help people anticipate a film’s emotional tone, understand the commitment, and reach a choice they feel comfortable making.

I treated “oddities” as mismatches between what an interface appears to assume and what people actually do. I searched public discussions in r/netflix, r/movies, r/MovieSuggestions, r/Letterboxd, and other communities, then checked those patterns against academic research and current product documentation. Reddit provides useful behavioral clues, but it overrepresents vocal users; I excluded obvious app promotions from the core evidence. The findings below are qualitative patterns and design hypotheses, not estimates of how common each behavior is.

There is broader evidence that the problem matters. Gracenote’s November 2025 survey across six countries reported an average **14 minutes spent searching**, with **19% abandoning a viewing session** after an unsuccessful search. These figures cover streaming content generally, rather than movie selection alone. :chatgpt-content-reference{index="0"}

The most useful mismatches are these:

1. **People spend their available viewing time making the viewing decision.**

   One Reddit user describes starting with enough time for a two-hour film, then browsing until only a 90-minute film would fit. Another discussion describes preparing snacks, scrolling, and becoming too tired to watch. The selection process changes the circumstances of the choice itself. :chatgpt-content-reference{index="1"}

   **Mismatch:** the catalogue supports continued exploration, while the person has a shrinking window for entertainment.

   **Underlying need:** “Help me use the evening I still have.”

   **Design hypothesis:** make runtime visible early and test an optional “I have about…” constraint. A finish-time estimate could be more meaningful than runtime alone, provided it clearly states whether ads or other interruptions are included.

   This also changes what success means: a person finding five interesting films but watching none may have received little value from a service intended for *tonight*.

2. **A person’s general taste differs from what they can handle tonight.**

   A recent movie discussion comes from someone who wants something sweet or funny before bed, although their watchlist mainly contains horror and films that make them cry. Their saved preferences are accurate; they simply don’t fit the present occasion. :chatgpt-content-reference{index="2"}

   Another request asks for a film that is low stakes and comforting, yet explicitly avoids comedy and cringe. That combination is much more specific than a genre. :chatgpt-content-reference{index="3"}

   **Mismatch:** taste categories describe what someone tends to like; tonight’s choice also depends on energy, emotional tolerance, and desired feeling.

   **Underlying need:** “Help me find something that meets me where I am.”

   **Design hypothesis:** let people express desired experiences—“easy to settle into,” “absorbing,” “gentle,” “something to discuss”—alongside conventional genres.

   Crucially, ask about the **experience they want**, rather than requiring them to identify their current emotion. Someone feeling sad might want comfort, distraction, or catharsis.

3. **Saving a film doesn’t mean wanting to watch it soon.**

   One user has around 40 saved titles but continues browsing, second-guessing, and sometimes watching nothing. Another Letterboxd user reports a watchlist approaching 2,000 films that still leaves them unable to choose. :chatgpt-content-reference{index="4"}

   A small 2024 interview study also found that most participants who used My List rarely maintained it or removed watched titles. That study involved 12 frequent Netflix users in Colombia, so its findings should be treated as exploratory. :chatgpt-content-reference{index="5"}

   **Mismatch:** a watchlist mixes curiosity, aspiration, recommendations, and immediate intention.

   **Underlying need:** “Remind me why this interested me, and help me decide whether now is the right moment.”

   **Design hypothesis:** distinguish “saved for someday” from a small “considering tonight” collection. Preserve an optional reason for saving—“recommended by a friend,” “beautiful atmosphere,” “watch together”—rather than only the title.

   This is especially relevant to your product: another bookmark button may preserve the decision problem instead of resolving it.

4. **A rewatch can be a deliberate, satisfying outcome.**

   A Netflix user describes films feeling like commitments:

   > “It’s either too long, too heavy, or not the right mood.”

   They often return to something familiar. In the same discussion, another person explains that familiarity means knowing what they will get. :chatgpt-content-reference{index="6"}

   **Mismatch:** discovery interfaces frequently foreground novelty, while the person may value predictability.

   **Underlying need:** “Give me a reliable experience when I don’t want to take a chance.”

   **Design hypothesis:** support both familiar favorites and new discoveries. Test an optional preference such as “a familiar favorite,” “something new with a familiar feel,” or “surprise me.”

   The important distinction is whether someone **wanted** the rewatch or reluctantly settled for it after a frustrating search. Those outcomes should be measured separately.

5. **Choosing together involves fairness and responsibility.**

   Couples describe taking turns or establishing rules about vetoes to manage different tastes. One person describes feeling nervous and ashamed when their partner appears not to enjoy their choice. These accounts show that movie selection can carry interpersonal stakes. :chatgpt-content-reference{index="7"}

   **Mismatch:** a recommendation for one profile doesn’t necessarily support a shared decision.

   **Underlying need:** “Help us find something we both accept without one person doing all the proposing or taking the blame.”

   **Design hypothesis:** test a lightweight shared shortlist and allow each person to express tonight’s preferences and exclusions.

   There are several possible jobs here: finding mutual enthusiasm, making an acceptable compromise, and taking fair turns. They may require different solutions. A matching mechanism alone would not establish which one matters most.

6. **People need reasons to trust a recommendation.**

   In a 2023 study of 20 US Netflix users, friends were frequently preferred as recommendation sources because they understood the viewer’s taste; watching also created something to discuss afterward. Participants still used platform recommendations, even when those weren’t their favorite source. :chatgpt-content-reference{index="8"}

   Users also complain about descriptions that foreground awards or cast credentials without explaining what the film is about, forcing them to seek more information. :chatgpt-content-reference{index="9"}

   **Mismatch:** an endorsement establishes reputation, but may leave personal relevance unclear.

   **Underlying need:** “Explain why this is worth my evening.”

   **Design hypothesis:** pair a short premise with a specific explanation of fit. For example, an illustrative description might say: *“A gently paced character story with warm humor and little sustained tension.”*

   Ratings can remain useful evidence. They answer a different question from pace, emotional intensity, or suitability for tonight.

7. **Information can help people choose while spoiling the experience they wanted.**

   Users describe autoplay previews revealing developments from seasons they haven’t watched, and thumbnails exposing story information. These particular accounts concern television, but they expose a relevant tension for movie discovery too: learning enough to choose without learning too much. :chatgpt-content-reference{index="10"}

   **Mismatch:** previews and artwork can reveal information before the viewer chooses to receive it.

   **Underlying need:** “Help me anticipate the experience while preserving discovery.”

   **Design hypothesis:** use a concise premise, editorial descriptions of tone, and user-controlled previews. Put detailed content information behind an intentional reveal.

   There is a further nuance: some people actively want specific warnings. DoesTheDogDie’s community content-warning service is evidence of an existing practice of checking sensitive material before watching. :chatgpt-content-reference{index="11"}

   The useful principle is **control over disclosure**. Different viewers want different amounts of information.

8. **A cinematic-looking interface can make comparison harder.**

   In Netflix’s redesign discussion, users complain about seeing fewer titles at once, repeatedly encountering the same films, and forgetting earlier options while scrolling. One describes using their phone to add titles to a list so they can subsequently find them on television. :chatgpt-content-reference{index="12"}

   **Mismatch:** presentation emphasizes individual titles, while some users need to scan and compare several candidates.

   **Underlying need:** “Let me understand my options without remembering everything.”

   **Design hypothesis:** keep key facts visible and consistently positioned. Preserve shortlist choices and scroll position when returning from a film page.

   These complaints don’t prove that a denser interface is universally better. They suggest testing the tradeoff between atmosphere, legibility, and comparison—particularly across phone, desktop, and TV contexts.

9. **“I don’t want this” has several meanings.**

   Users ask for ways to remove repeatedly recommended titles and distinguish disinterest from ratings. One complains that already watched or unwanted suggestions consume space that could contain useful alternatives. :chatgpt-content-reference{index="13"}

   **Mismatch:** rejection can be interpreted as a lasting preference even when it reflects tonight’s circumstances.

   **Underlying need:** “Understand why I’m passing, and let me change my mind.”

   **Design hypothesis:** distinguish a few meaningful actions: “seen it,” “not tonight,” and “not interested.” Keep them optional and reversible.

   This matters because the 2024 interview study found little use of explicit rating feedback. A service that requires users to continually train it may introduce more work into an already effortful task. :chatgpt-content-reference{index="14"}

10. **An attractive choice may become unusable at the last step.**

    Prime Video discussions describe frustration when a promising title requires renting, buying, or another subscription. A separate watchlist complaint concerns titles whose displayed inclusion status appears inconsistent with the available viewing options. These are user reports, rather than verification of each title’s actual entitlement. :chatgpt-content-reference{index="15"}

    **Mismatch:** a title appears available for consideration before the person understands its practical cost.

    **Underlying need:** “Help me choose something I can actually watch under acceptable conditions.”

    **Design hypothesis:** establish availability and cost before asking people to invest in evaluating a film. For a streaming-service feature, this means clear entitlement and relevant playback details. For an independent service, it also means country and provider availability.

    Your concept needs that scope decision eventually: a single-service catalogue and a cross-service guide have different responsibilities.

There are two counterpoints worth preserving.

**People sometimes enjoy discovery itself.** In a Letterboxd discussion, viewers describe themed runs, following directors or actors, recommendations, and spontaneous browsing as different ways to choose. Other users deliberately delegate the final decision to a wheel or a container of film titles. These are different relationships with choice, rather than one universal problem. :chatgpt-content-reference{index="16"}

**Reducing options works under particular conditions.** A meta-analysis covering 99 observations and 7,202 participants found that choice overload depends on factors including comparison difficulty, uncertainty about preferences, and the goal of minimizing effort. It doesn’t establish an ideal number of movie cards. :chatgpt-content-reference{index="17"}

My interpretation is that your service should help someone move between **exploring possibilities and making a decision**, with the transition remaining under their control.

The jobs to be done below are synthesized from those findings; they are proposed formulations, not participant quotations.

| Situation | Job to be done | Desired outcome |
|---|---|---|
| Tired after a demanding day | Help me choose something suited to the energy I have left | Relaxation with little selection effort |
| Want a particular atmosphere | Help me recognize films that deliver the feeling I’m seeking | Confidence about tone and experience |
| Watching with someone | Help us reach a choice that feels acceptable and fair | Shared anticipation |
| Interested in an unfamiliar film | Give me enough trustworthy information to take a chance | Curiosity with manageable uncertainty |
| Have limited time or access | Help me choose within tonight’s practical constraints | A feasible viewing plan |
| Saved many films | Help me bring the right saved film back at the right moment | A useful shortlist |
| Enjoy exploring cinema | Help me discover connections and possibilities | Pleasure in browsing |

For the first concept, I would focus on **someone choosing a film tonight with limited energy and no title already in mind**. That is a product hypothesis, rather than a validated target segment. It gives the prototype a clear occasion while allowing shared viewing to be investigated as an adjacent need.

Your intended value can then become observable:

| Value | What the user should experience | Evidence to seek |
|---|---|---|
| **Clarity** | “I understand what kind of experience this film offers.” | Accurate expectations before watching |
| **Ease** | “I can make progress without doing lots of work.” | Lower perceived effort |
| **Vibe** | “This feels suited to the evening I wanted.” | Reported fit after watching |
| **Confidence** | “I have enough reason to choose.” | Fewer unresolved questions |
| **Agency** | “I can refine, reject, or explore freely.” | Low feelings of pressure or restriction |

There are existing products to learn from. JustWatch already provides provider filtering and a unified watchlist; A Good Movie to Watch offers editorial recommendations and mood categories. Netflix’s current help documentation describes a limited iPhone/iPad beta for conversational, mood-based search. **Mood-based discovery is an established direction**, so its presence alone would provide weak differentiation. :chatgpt-content-reference{index="18"}

The opportunity I would investigate is the quality of the decision experience: **how clearly the service communicates fit, how effectively it handles constraints, and how comfortably someone reaches a choice.**

For the two pages in your brief, that suggests:

| Page | User question it should resolve | First elements to test |
|---|---|---|
| **Catalogue** | “Which films are worth considering tonight?” | Optional experience and runtime controls; comparable cards; a small shortlist; easy refinement |
| **Selected film** | “Do I feel ready to choose this?” | Short premise; tone, pace, and intensity; practical viewing details; explanation of fit; optional preview and content information |

Start with a few understandable experience controls. A long questionnaire or a large vocabulary of “vibes” could create another selection task. Mood and intensity descriptions would also require credible editorial metadata; they should be presented as informed descriptions, not promises of how every viewer will feel.

Before committing to features, I’d run a small qualitative round with solo viewers and several viewing pairs. Ask them to reconstruct their **last actual attempt** to choose a film:

- What started the search, and what did they want from the evening?
- Which candidates did they reject, and why?
- What information did they seek outside the streaming app?
- What finally made a choice feel acceptable?
- Did the viewing experience match their expectations?

Then compare a conventional catalogue with a version that makes experience and constraints clearer. Observe time to a confident choice, perceived effort, unanswered questions, and abandonment. Follow up after viewing to assess expectation accuracy. A faster click alone would leave the central value untested.

**The first concept I’d test is: “Find a film that fits tonight—and understand why it fits.”** That gives clarity, experience, and vibe a concrete role in the product, and gives you a research question you can evaluate through both pages.
