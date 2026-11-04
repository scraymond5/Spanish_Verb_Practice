
"use strict";

// ==================================================
// GLOBAL VARIABLES
// ==================================================

let verbs = [];
let currentVerb = null;

let selectedChapter = 2;
let selectedLanguage = "spanish";
let selectedTense = "present";
let practiceScope = "comprehensive";

let activeInput = null;
let sessionVerbs = [];
let sessionIndex = 0;
let sessionVerbCount = 0;

let verbsAttempted = 0;
let answersGraded = 0;
let correctAnswers = 0;
let currentVerbScored = false;
let answersRevealed = false;

const MINIMUM_VERBS = 5;
const FIRST_CHAPTER = 2;
const TOTAL_CHAPTERS = 11;

const pronouns = [
    "yo",
    "tú",
    "él / ella / usted",
    "nosotros/as",
    "vosotros/as",
    "ellos / ellas / ustedes"
];

const tenseNames = {
    present: "Present",
    preterite: "Preterite",
    imperfect: "Imperfect"
};

const spanishCharacters = [
    "á", "é", "í", "ó", "ú", "ü", "ñ"
];


// ==================================================
// INITIALIZE APPLICATION
// ==================================================

document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {

    populateChapters();
    createAccentButtons();
    attachEventListeners();

    try {

        const response = await fetch("verbs.json");

        if (!response.ok) {
            throw new Error("Unable to load verbs.json");
        }

        verbs = await response.json();

        updateTenseOptions();
        updateVerbCount();
        updateVerbLimit();

    } catch (error) {

        console.error(error);

        document.getElementById("verbCount").textContent =
            "Error loading verbs.json.";

        document.getElementById("startBtn").disabled = true;
    }
}


// ==================================================
// CHAPTER SELECTION
// ==================================================

function populateChapters() {

    const chapterSelect =
        document.getElementById("chapter");

    chapterSelect.innerHTML = "";

    for (
        let chapter = FIRST_CHAPTER;
        chapter <= TOTAL_CHAPTERS;
        chapter++
    ) {

        const option = document.createElement("option");

        option.value = chapter;
        option.textContent = "Chapter " + chapter;

        chapterSelect.appendChild(option);
    }

    chapterSelect.value = selectedChapter;
}


// ==================================================
// ELIGIBLE VERBS
// ==================================================

function getEligibleVerbs() {

    if (practiceScope === "chapter") {

        // Only verbs introduced in the selected chapter.
        return verbs.filter(verb =>
            Number(verb.chapter) === selectedChapter
        );
    }

    // All verbs from Chapter 2 through selected chapter.
    return verbs.filter(verb =>
        Number(verb.chapter) >= FIRST_CHAPTER &&
        Number(verb.chapter) <= selectedChapter
    );
}


// ==================================================
// VERB COUNT DISPLAY
// ==================================================

function updateVerbCount() {

    const count = getEligibleVerbs().length;

    const description =
        practiceScope === "chapter"
            ? " in Chapter " + selectedChapter
            : " through Chapter " + selectedChapter;

    document.getElementById("verbCount").textContent =
        count + " verbs available" + description;
}


// ==================================================
// NUMBER OF VERBS INPUT
// ==================================================

function updateVerbLimit() {

    const input = document.getElementById("verbLimit");
    const range = document.getElementById("verbRange");

    const maximum = getEligibleVerbs().length;

    input.min = MINIMUM_VERBS;
    input.max = maximum;
    input.step = 1;

    // Keep the previous value if possible.
    // Reduce it if it exceeds the available number.
    if (Number(input.value) > maximum) {
        input.value = maximum;
    }

    range.textContent =
        "Enter between " + MINIMUM_VERBS +
        " and " + maximum + " verbs.";

    validateVerbLimit();
}

function validateVerbLimit() {

    const input = document.getElementById("verbLimit");
    const startButton = document.getElementById("startBtn");

    const maximum = getEligibleVerbs().length;
    const requested = Number(input.value);

    const valid =
        input.value.trim() !== "" &&
        Number.isInteger(requested) &&
        requested >= MINIMUM_VERBS &&
        requested <= maximum;

    startButton.disabled = !valid;

    input.setCustomValidity(
        valid
            ? ""
            : "Enter a whole number between " +
              MINIMUM_VERBS + " and " + maximum + "."
    );

    return valid;
}


// ==================================================
// TENSE SELECTION
// ==================================================

function getAvailableTenses() {

    return [
        "present",
        "preterite",
        "imperfect"
    ];
}

function updateTenseOptions() {

    const tenseSelect =
        document.getElementById("tense");

    tenseSelect.innerHTML = "";

    // Add individual tenses first.
    getAvailableTenses().forEach(tense => {

        const option = document.createElement("option");

        option.value = tense;
        option.textContent = tenseNames[tense];

        tenseSelect.appendChild(option);
    });

    // Add All Available Tenses last.
    const allOption = document.createElement("option");

    allOption.value = "all";
    allOption.textContent = "All Tenses";

    tenseSelect.appendChild(allOption);

    tenseSelect.value = selectedTense;
}

function getSelectedTenses() {

    if (selectedTense === "all") {
        return getAvailableTenses();
    }

    return [selectedTense];
}


// ==================================================
// EVENT LISTENERS
// ==================================================

function attachEventListeners() {

    // Chapter selection
    document.getElementById("chapter")
        .addEventListener("change", event => {

            selectedChapter = Number(event.target.value);

            updateTenseOptions();
            updateVerbCount();
            updateVerbLimit();
            hidePractice();
        });

    // Practice scope
    document.querySelectorAll(
        'input[name="practiceScope"]'
    ).forEach(radio => {

        radio.addEventListener("change", event => {

            practiceScope = event.target.value;

            updateVerbCount();
            updateVerbLimit();
            hidePractice();
        });
    });

    // Tense selection
    document.getElementById("tense")
        .addEventListener("change", event => {

            selectedTense = event.target.value;
            hidePractice();
        });

    // Language selection
    document.querySelectorAll(
        'input[name="language"]'
    ).forEach(radio => {

        radio.addEventListener("change", event => {

            selectedLanguage = event.target.value;
            hidePractice();
        });
    });

    // Number of verbs
    document.getElementById("verbLimit")
        .addEventListener("input", () => {

            validateVerbLimit();
            hidePractice();
        });

    // Practice buttons
    document.getElementById("startBtn")
        .addEventListener("click", startPractice);

    document.getElementById("checkBtn")
        .addEventListener("click", checkAnswers);

    document.getElementById("showBtn")
        .addEventListener("click", showAnswers);

    document.getElementById("nextBtn")
        .addEventListener("click", nextVerb);

    document.getElementById("againBtn")
        .addEventListener("click", startPractice);
}

function hidePractice() {

    document.getElementById("practice").hidden = true;
    document.getElementById("summary").hidden = true;

    document.getElementById("startBtn").textContent =
        "Start Practice";
}


// ==================================================
// START PRACTICE
// ==================================================

function startPractice() {

    if (!validateVerbLimit()) {

        document.getElementById("verbLimit")
            .reportValidity();

        return;
    }

    const requested = Number(
        document.getElementById("verbLimit").value
    );

    // Retrieve verbs based on chapter and scope.
    const eligible = getEligibleVerbs();

    // Randomize the verbs.
    shuffleArray(eligible);

    // Select exactly the requested number.
    sessionVerbs = eligible.slice(0, requested);

    sessionVerbCount = sessionVerbs.length;
    sessionIndex = 0;

    verbsAttempted = 0;
    answersGraded = 0;
    correctAnswers = 0;

    currentVerb = null;
    currentVerbScored = false;
    answersRevealed = false;

    updateStatistics();

    document.getElementById("summary").hidden = true;
    document.getElementById("practice").hidden = false;

    document.getElementById("startBtn").textContent =
        "Restart Practice";

    displayNextVerb();
}


// ==================================================
// RANDOMIZE VERBS - FISHER-YATES
// ==================================================

function shuffleArray(array) {

    for (let i = array.length - 1; i > 0; i--) {

        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [array[i], array[j]] =
            [array[j], array[i]];
    }

    return array;
}


// ==================================================
// NEXT VERB
// ==================================================

function nextVerb() {

    sessionIndex++;

    if (sessionIndex >= sessionVerbCount) {
        finishPractice();
        return;
    }

    displayNextVerb();
}

function displayNextVerb() {

    currentVerb = sessionVerbs[sessionIndex];

    currentVerbScored = false;
    answersRevealed = false;
    activeInput = null;

    document.getElementById("result").textContent = "";
    document.getElementById("translation").hidden = true;

    document.getElementById("checkBtn").disabled = false;

    displayVerb();
    createConjugationTable();
    updateProgress();
}


// ==================================================
// PROGRESS INDICATOR
// ==================================================

function updateProgress() {

    const currentNumber = sessionIndex + 1;

    document.getElementById("progress").textContent =
        "Verb " + currentNumber +
        " of " + sessionVerbCount;

    const progressBar =
        document.getElementById("progressBar");

    progressBar.max = sessionVerbCount;
    progressBar.value = sessionIndex;

    document.getElementById("nextBtn").textContent =
        currentNumber === sessionVerbCount
            ? "Finish Practice"
            : "Next Verb";
}


// ==================================================
// DISPLAY VERB
// ==================================================

function displayVerb() {

    const prompt =
        document.getElementById("verbPrompt");

    prompt.textContent =
        selectedLanguage === "spanish"
            ? currentVerb.spanish
            : currentVerb.english;

    document.getElementById("verbChapter").textContent =
        "Introduced in Chapter " + currentVerb.chapter;
}

function revealTranslation() {

    const translation =
        document.getElementById("translation");

    translation.textContent =
        selectedLanguage === "spanish"
            ? currentVerb.english
            : currentVerb.spanish;

    translation.hidden = false;
}


// ==================================================
// CREATE CONJUGATION TABLE
// ==================================================

function createConjugationTable() {

    const tableHead =
        document.getElementById("tableHead");

    const tableBody =
        document.getElementById("tableBody");

    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

    const tenses = getSelectedTenses();

    // Table headings
    const headingRow = document.createElement("tr");

    const pronounHeading = document.createElement("th");
    pronounHeading.textContent = "Pronoun";

    headingRow.appendChild(pronounHeading);

    tenses.forEach(tense => {

        const heading = document.createElement("th");
        heading.textContent = tenseNames[tense];

        headingRow.appendChild(heading);
    });

    tableHead.appendChild(headingRow);

    // Six pronoun rows
    pronouns.forEach((pronoun, index) => {

        const row = document.createElement("tr");

        const pronounCell = document.createElement("td");
        pronounCell.textContent = pronoun;

        row.appendChild(pronounCell);

        tenses.forEach(tense => {

            const cell = document.createElement("td");

            const input = document.createElement("input");

            input.type = "text";
            input.className = "conjugation-input";

            input.autocomplete = "off";
            input.spellcheck = false;

            input.dataset.tense = tense;
            input.dataset.index = index;

            input.setAttribute(
                "aria-label",
                pronoun + " " + tenseNames[tense]
            );

            input.addEventListener("focus", () => {
                activeInput = input;
            });

            input.addEventListener("input", () => {
                clearInputFeedback(input);
            });

            const feedback = document.createElement("span");
            feedback.className = "feedback";

            cell.appendChild(input);
            cell.appendChild(feedback);

            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });
}


// ==================================================
// SPANISH CHARACTER TOOLBAR
// ==================================================

function createAccentButtons() {

    const container =
        document.getElementById("accentButtons");

    spanishCharacters.forEach(character => {

        const button = document.createElement("button");

        button.type = "button";
        button.textContent = character;

        button.addEventListener("mousedown", event => {
            event.preventDefault();
        });

        button.addEventListener("click", () => {
            insertCharacter(character);
        });

        container.appendChild(button);
    });
}

function insertCharacter(character) {

    if (!activeInput || activeInput.disabled) {
        return;
    }

    const start = activeInput.selectionStart;
    const end = activeInput.selectionEnd;

    activeInput.setRangeText(
        character,
        start,
        end,
        "end"
    );

    activeInput.focus();

    activeInput.dispatchEvent(
        new Event("input", { bubbles: true })
    );
}


// ==================================================
// ANSWER COMPARISON
// ==================================================

function normalizeAnswer(answer) {

    return answer
        .trim()
        .toLocaleLowerCase("es")
        .normalize("NFC");
}

// Used only to identify accent errors.
// Accents are required for correct answers.

function removeAccents(answer) {

    return answer
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function evaluateAnswer(studentAnswer, correctAnswer) {

    const student = normalizeAnswer(studentAnswer);
    const expected = normalizeAnswer(correctAnswer);

    if (student === expected) {
        return "correct";
    }

    if (
        student !== "" &&
        removeAccents(student) === removeAccents(expected)
    ) {
        return "accent";
    }

    return "incorrect";
}


// ==================================================
// CLEAR INPUT FEEDBACK
// ==================================================

function clearInputFeedback(input) {

    input.classList.remove("correct", "incorrect");

    const feedback = input.parentElement
        .querySelector(".feedback");

    feedback.textContent = "";
    feedback.className = "feedback";
}


// ==================================================
// CHECK ANSWERS
// ==================================================

function checkAnswers() {

    // Do not grade after answers have been revealed.
    if (answersRevealed) {
        return;
    }

    revealTranslation();

    const inputs = document.querySelectorAll(
        ".conjugation-input"
    );

    let correctCount = 0;

    inputs.forEach(input => {

        const tense = input.dataset.tense;
        const index = Number(input.dataset.index);

        const expected =
            currentVerb.conjugations[tense][index];

        const result = evaluateAnswer(
            input.value,
            expected
        );

        clearInputFeedback(input);

        const feedback = input.parentElement
            .querySelector(".feedback");

        if (result === "correct") {

            correctCount++;

            input.classList.add("correct");

            feedback.className = "feedback correct";
            feedback.textContent = "Correct";

        } else if (result === "accent") {

            input.classList.add("incorrect");

            feedback.className = "feedback incorrect";
            feedback.textContent = "Accent error";

        } else {

            input.classList.add("incorrect");

            feedback.className = "feedback incorrect";
            feedback.textContent = "Incorrect";
        }
    });

    const total = inputs.length;

    document.getElementById("result").textContent =
        "Score: " + correctCount + " / " + total;

    // Only the first check counts toward session statistics.
    if (!currentVerbScored) {

        verbsAttempted++;
        answersGraded += total;
        correctAnswers += correctCount;

        currentVerbScored = true;

        updateStatistics();
    }
}


// ==================================================
// SHOW ANSWERS
// ==================================================

function showAnswers() {

    revealTranslation();

    const inputs = document.querySelectorAll(
        ".conjugation-input"
    );

    inputs.forEach(input => {

        const tense = input.dataset.tense;
        const index = Number(input.dataset.index);

        const expected =
            currentVerb.conjugations[tense][index];

        const result = evaluateAnswer(
            input.value,
            expected
        );

        clearInputFeedback(input);

        const feedback = input.parentElement
            .querySelector(".feedback");

        if (result === "correct") {

            input.classList.add("correct");

            feedback.className = "feedback correct";
            feedback.textContent = "Correct";

        } else {

            input.classList.add("incorrect");

            feedback.className = "feedback incorrect";
            feedback.textContent = "Answer: " + expected;
        }

        // Prevent changes after revealing the answers.
        input.disabled = true;
    });

    answersRevealed = true;

    document.getElementById("checkBtn").disabled = true;

    document.getElementById("result").textContent =
        "Correct answers displayed.";
}


// ==================================================
// UPDATE SESSION STATISTICS
// ==================================================

function updateStatistics() {

    document.getElementById("attempts").textContent =
        verbsAttempted;

    const accuracy = answersGraded === 0
        ? 0
        : Math.round(
            correctAnswers / answersGraded * 100
        );

    document.getElementById("accuracy").textContent =
        accuracy + "%";
}


// ==================================================
// FINISH PRACTICE
// ==================================================

function finishPractice() {

    const accuracy = answersGraded === 0
        ? 0
        : Math.round(
            correctAnswers / answersGraded * 100
        );

    document.getElementById("practice").hidden = true;
    document.getElementById("summary").hidden = false;

    document.getElementById("summaryVerbs").textContent =
        "Verbs in Session: " + sessionVerbCount;

    document.getElementById("summaryAnswers").textContent =
        "Answers Graded: " + answersGraded;

    document.getElementById("summaryCorrect").textContent =
        "Correct Answers: " + correctAnswers;

    document.getElementById("summaryAccuracy").textContent =
        "First-Check Accuracy: " + accuracy + "%";

    document.getElementById("startBtn").textContent =
        "Start Practice";
}
