// Firebase configuration provided by user
const firebaseConfig = {
    apiKey: "AIzaSyDP6SlnTI2u7nu9Jd79lALRVzRNaTpdvMA",
    authDomain: "kpop-bias-tracker.firebaseapp.com",
    projectId: "kpop-bias-tracker",
    storageBucket: "kpop-bias-tracker.firebasestorage.app",
    messagingSenderId: "109685560726",
    appId: "1:109685560726:web:38ae604e391e8a8822b9b7"
};

// Initialize Firebase using Global compat mode since we're using local file://
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements - Main Form
    const mainScreen = document.getElementById("mainScreen");
    const collectionScreen = document.getElementById("collectionScreen");
    const groupSelect = document.getElementById("groupSelect");
    const biasSelect = document.getElementById("biasSelect");
    const wrecker1Select = document.getElementById("wrecker1Select");
    const wrecker2Select = document.getElementById("wrecker2Select");
    const favSongInput = document.getElementById("favSongInput");
    const membersSection = document.getElementById("membersSection");
    const submitBtn = document.getElementById("submitBtn");
    const biasForm = document.getElementById("biasForm");
    
    // DOM Elements - Result Card
    const resultCard = document.getElementById("resultCard");
    const resultGroup = document.getElementById("resultGroup");
    const resBias = document.getElementById("resBias");
    const resWrecker1 = document.getElementById("resWrecker1");
    const resWrecker2 = document.getElementById("resWrecker2");
    const resFavSong = document.getElementById("resFavSong");
    const resetBtn = document.getElementById("resetBtn");
    
    // DOM Elements - Navigation & Collection
    const viewCollectionBtn = document.getElementById("viewCollectionBtn");
    const goToCollectionBtn = document.getElementById("goToCollectionBtn");
    const backToMainBtn = document.getElementById("backToMainBtn");
    const cardsGrid = document.getElementById("cardsGrid");
    const emptyState = document.getElementById("emptyState");

    // DOM Elements - Top Lists
    const topListsScreenEl = document.getElementById("topListsScreen");
    const viewTopListsBtnEl = document.getElementById("viewTopListsBtn");
    const backFromTopListsBtnEl = document.getElementById("backFromTopListsBtn");
    const topListsFormEl = document.getElementById("topListsForm");

    // USER PROFILE & FIREBASE STATE
    let currentUsername = localStorage.getItem("kpopUsername") || "";
    let viewingUsername = ""; // Empty means viewing self
    let savedBiases = {};
    let topListsData = { currSongs: [], allTimeSongs: [], boyGroups: [], girlGroups: [] };

    const currentUserInput = document.getElementById("currentUsername");
    const friendUserInput = document.getElementById("friendUsername");
    const loadFriendBtn = document.getElementById("loadFriendBtn");
    const reloadMeBtn = document.getElementById("reloadMeBtn");

    if (currentUsername) {
        currentUserInput.value = currentUsername;
        loadProfileFromFirebase(currentUsername);
    }

    currentUserInput.addEventListener("keyup", (e) => {
        currentUsername = e.target.value.trim().toLowerCase();
        localStorage.setItem("kpopUsername", currentUsername);
        if(currentUsername && !viewingUsername) {
            // throttle load if necessary, but keyup is fine for standard changes
            loadProfileFromFirebase(currentUsername);
        }
    });

    loadFriendBtn.addEventListener("click", () => {
        const friend = friendUserInput.value.trim().toLowerCase();
        if(friend) {
            viewingUsername = friend;
            reloadMeBtn.classList.remove("hidden");
            document.title = `Viewing ${friend}'s Biases`;
            loadProfileFromFirebase(friend);
        }
    });

    reloadMeBtn.addEventListener("click", () => {
        viewingUsername = "";
        friendUserInput.value = "";
        reloadMeBtn.classList.add("hidden");
        document.title = "K-Pop Bias Selector";
        loadProfileFromFirebase(currentUsername);
    });

    async function loadProfileFromFirebase(username) {
        if(!username) return;
        try {
            const docRef = db.collection("users").doc(username);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                const data = docSnap.data();
                savedBiases = data.biases || {};
                topListsData = data.topLists || { currSongs: [], allTimeSongs: [], boyGroups: [], girlGroups: [] };
            } else {
                savedBiases = {};
                topListsData = { currSongs: [], allTimeSongs: [], boyGroups: [], girlGroups: [] };
            }
            
            // Re-render UI depending on which screen is active
            if(!collectionScreen.classList.contains("hidden")) renderCollection();
            else if(topListsScreenEl && !topListsScreenEl.classList.contains("hidden")) loadTopListsDataUI();
        } catch(e) {
            console.error("Error loading profile:", e);
        }
    }

    async function saveProfileToFirebase() {
        if (viewingUsername && viewingUsername !== currentUsername) {
            alert("🔒 You are in view-only mode. You cannot edit a friend's profile!");
            return false;
        }
        if (!currentUsername) {
            alert("⚠️ Please enter 'My Username' in the top left first!");
            return false;
        }
        try {
            await db.collection("users").doc(currentUsername).set({
                biases: savedBiases,
                topLists: topListsData
            }, { merge: true }); // Use merge so we don't accidentally overwrite missing fields completely
            return true;
        } catch(e) {
            console.error("Error saving profile:", e);
            alert("Error saving to cloud! Check console. Make sure Firebase test mode is enabled.");
            return false;
        }
    }

    // Populate Groups from kpopData
    // We put a slight delay just in case data.js loads slowly, though it should be synchronous.
    if (typeof kpopData !== 'undefined' && kpopData.girlGroups && kpopData.boyGroups) {
        const fragment = document.createDocumentFragment();
        const appendOptGroup = (label, groupsObj) => {
            const optGroup = document.createElement("optgroup");
            optGroup.label = label;
            Object.keys(groupsObj).forEach(groupName => {
                const option = document.createElement("option");
                option.value = groupName;
                option.textContent = groupName;
                optGroup.appendChild(option);
            });
            fragment.appendChild(optGroup);
        };
        appendOptGroup("Girl Groups", kpopData.girlGroups);
        appendOptGroup("Boy Groups", kpopData.boyGroups);
        appendOptGroup("Co-ed Groups", kpopData.coedGroups);
        appendOptGroup("Soloists", kpopData.soloists);
        groupSelect.appendChild(fragment);
    } else {
        console.error("kpopData is not properly loaded! Make sure data.js is functioning.");
    }

    const showCollection = () => {
        mainScreen.classList.add("hidden");
        if(topListsScreenEl) topListsScreenEl.classList.add("hidden");
        collectionScreen.classList.remove("hidden");
        document.getElementById("collectionSubtitle").textContent = viewingUsername 
            ? `Viewing ${viewingUsername}'s saved biases...` 
            : `Loading your saved biases...`;
        renderCollection();
    };

    const showMainScreen = () => {
        collectionScreen.classList.add("hidden");
        if(topListsScreenEl) topListsScreenEl.classList.add("hidden");
        mainScreen.classList.remove("hidden");
    };

    const renderCollection = () => {
        cardsGrid.innerHTML = '';
        const groups = Object.keys(savedBiases);
        if (groups.length === 0) {
            emptyState.classList.remove("hidden");
            return;
        }
        emptyState.classList.add("hidden");
        
        groups.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).forEach(group => {
            const data = savedBiases[group];
            const isSoloist = !!(kpopData.soloists && kpopData.soloists[group]);
            const card = document.createElement("div");
            card.className = "saved-card";
            card.innerHTML = `
                <div class="saved-card-header">
                    <span>${group}</span>
                    ${viewingUsername ? '' : `<button class="remove-btn" data-group="${group}" title="Remove this group">&times;</button>`}
                </div>
                ${!isSoloist ? `
                <div class="saved-card-item">
                    <span class="label">Bias:</span>
                    <span class="value crown">${data.bias}</span>
                </div>
                <div class="saved-card-item">
                    <span class="label">Wrecker 1:</span>
                    <span class="value sparkle">${data.wrecker1}</span>
                </div>
                <div class="saved-card-item">
                    <span class="label">Wrecker 2:</span>
                    <span class="value star">${data.wrecker2}</span>
                </div>` : ''}
                ${data.favSong ? `
                <div class="saved-card-item" style="margin-top: 1rem; padding-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.1);">
                    <span class="label">Fav Song:</span>
                    <span class="value music">${data.favSong}</span>
                </div>` : ''}
            `;
            
            if (!viewingUsername) {
                const removeBtn = card.querySelector('.remove-btn');
                removeBtn.addEventListener('click', async () => {
                    delete savedBiases[group];
                    await saveProfileToFirebase();
                    renderCollection();
                });
            }
            cardsGrid.appendChild(card);
        });
    };

    viewCollectionBtn.addEventListener("click", showCollection);
    goToCollectionBtn.addEventListener("click", showCollection);
    backToMainBtn.addEventListener("click", showMainScreen);

    groupSelect.addEventListener("change", (e) => {
        const selectedGroup = e.target.value;
        const isSoloist = !!(kpopData.soloists && kpopData.soloists[selectedGroup]);
        const members = (kpopData.girlGroups && kpopData.girlGroups[selectedGroup]) ||
                        (kpopData.boyGroups && kpopData.boyGroups[selectedGroup]) ||
                        (kpopData.coedGroups && kpopData.coedGroups[selectedGroup]) ||
                        (kpopData.soloists && kpopData.soloists[selectedGroup]) || [];

        const populateMembers = (selectElement, specificVal) => {
            selectElement.innerHTML = '<option value="None">None</option>';
            const sortedMembers = [...members].sort();
            sortedMembers.forEach(member => {
                const opt = document.createElement("option");
                opt.value = member;
                opt.textContent = member;
                if (specificVal === member) opt.selected = true;
                selectElement.appendChild(opt);
            });
        };

        const existingData = savedBiases[selectedGroup] || {};
        populateMembers(biasSelect, existingData.bias);
        populateMembers(wrecker1Select, existingData.wrecker1);
        populateMembers(wrecker2Select, existingData.wrecker2);
        favSongInput.value = existingData.favSong || '';

        if (isSoloist) {
            biasSelect.closest(".form-group").classList.add("hidden");
            wrecker1Select.closest(".form-group").classList.add("hidden");
            wrecker2Select.closest(".form-group").classList.add("hidden");
        } else {
            biasSelect.closest(".form-group").classList.remove("hidden");
            wrecker1Select.closest(".form-group").classList.remove("hidden");
            wrecker2Select.closest(".form-group").classList.remove("hidden");
        }

        if (membersSection.classList.contains("hidden")) {
            membersSection.classList.remove("hidden");
            setTimeout(() => {
                submitBtn.classList.remove("hidden");
                submitBtn.classList.add("slide-in");
                submitBtn.style.setProperty('--delay', '4');
            }, 100);
        }
    });

    biasForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const group = groupSelect.value;
        if (!group) return;

        // Try applying UI lock on friend view before saving
        if (viewingUsername && viewingUsername !== currentUsername) {
            alert("🔒 You are in view-only mode. You cannot edit a friend's profile!");
            return;
        }

        savedBiases[group] = {
            bias: biasSelect.value,
            wrecker1: wrecker1Select.value,
            wrecker2: wrecker2Select.value,
            favSong: favSongInput.value.trim()
        };
        
        const success = await saveProfileToFirebase();
        if (!success) return;

        biasForm.classList.add("hidden");
        const isSoloist = !!(kpopData.soloists && kpopData.soloists[group]);
        if (isSoloist) {
            resBias.closest(".result-item").classList.add("hidden");
            resWrecker1.closest(".result-item").classList.add("hidden");
            resWrecker2.closest(".result-item").classList.add("hidden");
        } else {
            resBias.closest(".result-item").classList.remove("hidden");
            resWrecker1.closest(".result-item").classList.remove("hidden");
            resWrecker2.closest(".result-item").classList.remove("hidden");
        }
        resultGroup.textContent = group;
        resBias.textContent = savedBiases[group].bias;
        resWrecker1.textContent = savedBiases[group].wrecker1;
        resWrecker2.textContent = savedBiases[group].wrecker2;
        resFavSong.textContent = savedBiases[group].favSong || 'None';
        resultCard.classList.remove("hidden");
    });

    resetBtn.addEventListener("click", () => {
        resultCard.classList.add("hidden");
        biasForm.reset();
        membersSection.classList.add("hidden");
        submitBtn.classList.add("hidden");
        submitBtn.classList.remove("slide-in");
        biasForm.classList.remove("hidden");
        setTimeout(() => groupSelect.focus(), 100);
    });

    // --- TOP LISTS FORM CREATION ---
    if (typeof kpopData !== 'undefined') {
        const createGroupDropdowns = (container, type, dataObj) => {
            if (!container) return;
            const groups = Object.keys(dataObj || {}).sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            for (let i = 1; i <= 10; i++) {
                const row = document.createElement("div");
                row.className = "input-row";
                const selectObj = document.createElement("select");
                selectObj.className = "custom-input";
                selectObj.id = `${type}Group${i}`;
                const defaultOpt = document.createElement("option");
                defaultOpt.value = "";
                defaultOpt.textContent = "Select group...";
                defaultOpt.selected = true;
                selectObj.appendChild(defaultOpt);
                groups.forEach(g => {
                    const opt = document.createElement("option");
                    opt.value = g;
                    opt.textContent = g;
                    selectObj.appendChild(opt);
                });
                row.innerHTML = `<span class="number">${i}</span>`;
                row.appendChild(selectObj);
                container.appendChild(row);
            }
        };
        createGroupDropdowns(document.getElementById("bgList"), "bg", kpopData.boyGroups);
        createGroupDropdowns(document.getElementById("ggList"), "gg", kpopData.girlGroups);
    }

    const loadTopListsDataUI = () => {
        for(let i=1; i<=5; i++) {
            const curr = document.getElementById(`currSong${i}`);
            const allT = document.getElementById(`allTimeSong${i}`);
            if(curr) curr.value = topListsData.currSongs[i-1] || "";
            if(allT) allT.value = topListsData.allTimeSongs[i-1] || "";
        }
        for(let i=1; i<=10; i++) {
            const bgSelect = document.getElementById(`bgGroup${i}`);
            const ggSelect = document.getElementById(`ggGroup${i}`);
            if(bgSelect) bgSelect.value = topListsData.boyGroups[i-1] || "";
            if(ggSelect) ggSelect.value = topListsData.girlGroups[i-1] || "";
        }
    };

    if (viewTopListsBtnEl && topListsScreenEl) {
        viewTopListsBtnEl.addEventListener("click", () => {
            mainScreen.classList.add("hidden");
            collectionScreen.classList.add("hidden");
            topListsScreenEl.classList.remove("hidden");
            
            // Adjust header depending on who we view
            const titleEl = document.querySelector("#topListsScreen .title");
            if (titleEl) {
                titleEl.innerHTML = viewingUsername 
                    ? `<span>${viewingUsername}'s</span> Top Lists`
                    : `My <span>Top Lists</span>`;
            }
            
            loadTopListsDataUI();
        });
    }

    if (backFromTopListsBtnEl && topListsScreenEl) {
        backFromTopListsBtnEl.addEventListener("click", () => {
            topListsScreenEl.classList.add("hidden");
            mainScreen.classList.remove("hidden");
        });
    }

    if(topListsFormEl) {
        topListsFormEl.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            if (viewingUsername && viewingUsername !== currentUsername) {
                alert("🔒 You are in view-only mode. You cannot edit a friend's profile!");
                return;
            }
            
            topListsData.currSongs = [];
            topListsData.allTimeSongs = [];
            for(let i=1; i<=5; i++) {
                const curr = document.getElementById(`currSong${i}`);
                const allT = document.getElementById(`allTimeSong${i}`);
                if(curr) topListsData.currSongs.push(curr.value.trim());
                if(allT) topListsData.allTimeSongs.push(allT.value.trim());
            }
            
            topListsData.boyGroups = [];
            topListsData.girlGroups = [];
            for(let i=1; i<=10; i++) {
                const bgSelect = document.getElementById(`bgGroup${i}`);
                const ggSelect = document.getElementById(`ggGroup${i}`);
                if(bgSelect) topListsData.boyGroups.push(bgSelect.value);
                if(ggSelect) topListsData.girlGroups.push(ggSelect.value);
            }
            
            const success = await saveProfileToFirebase();
            if(!success) return;

            const msg = document.getElementById("topListsSavedMsg");
            if(msg) {
                msg.classList.remove("hidden");
                msg.classList.remove("fade-out");
                setTimeout(() => {
                    msg.classList.add("fade-out");
                    setTimeout(() => msg.classList.add("hidden"), 500);
                }, 3000);
            }
        });
    }

    // --- POPULATE FRIENDS DROPDOWN ---
    async function populateFriendsList() {
        try {
            const usersRef = db.collection("users");
            const snapshot = await usersRef.get();
            const friendSelect = document.getElementById("friendUsername");
            if (!friendSelect) return;
            
            friendSelect.innerHTML = '<option value="" disabled selected>Select friend...</option>';
            
            if (snapshot.empty) {
                console.warn("No users found in database.");
                return;
            }

            const users = [];
            snapshot.forEach(doc => {
                users.push(doc.id);
            });
            
            users.sort().forEach(username => {
                const opt = document.createElement("option");
                opt.value = username;
                opt.textContent = username;
                friendSelect.appendChild(opt);
            });
        } catch (e) {
            console.error("Error fetching friends:", e);
            alert("Error loading friends dropdown: " + e.message + "\n\nThis might be due to Firebase Security Rules preventing list queries. Please check your Firestore rules.");
        }
    }

    populateFriendsList();
});
