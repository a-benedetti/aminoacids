document.addEventListener("DOMContentLoaded", function () {
    let currentResidue = "";
    let is2DView = true;
    let aminoAcidData = {};
    let openCards = [];


    // Helper function to make a card draggable
    function makeCardDraggable(card) {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        card.addEventListener("mousedown", (event) => {
            isDragging = true;
            offsetX = event.clientX - card.getBoundingClientRect().left;
            offsetY = event.clientY - card.getBoundingClientRect().top;
            card.style.zIndex = 1000; // Bring the card to the front
        });

        document.addEventListener("mousemove", (event) => {
            if (isDragging) {
                const left = event.clientX - offsetX;
                const top = event.clientY - offsetY;

                // Prevent the card from going off-screen
                card.style.left = `${Math.max(0, Math.min(window.innerWidth - card.offsetWidth, left))}px`;
                card.style.top = `${Math.max(0, Math.min(window.innerHeight - card.offsetHeight, top))}px`;
            }
        });

        document.addEventListener("mouseup", () => {
            if (isDragging) {
                isDragging = false;
                card.style.zIndex = ""; // Reset zIndex
            }
        });
    }

    // Load amino acid data and populate tiles
    async function loadAminoAcidData() {
        try {
            const response = await fetch("data/reformatted_amino_acids.json");
            const data = await response.json();
            aminoAcidData = data;

            const container = document.getElementById("amino-acid-container");
            if (!container) {
                console.error("Container element 'amino-acid-container' not found.");
                return;
            }

            Object.keys(data).forEach(residue => {
                const aminoAcid = data[residue];
                const tile = document.createElement("div");
                tile.className = `amino-acid tile-${aminoAcid.charge.replace(" ", "-").toLowerCase()}`;
                tile.dataset.residue = residue;

                // Generate the SVG image using OpenChemLib
                const molecule = OCL.Molecule.fromSmiles(aminoAcid.smiles);

                // Configure rendering options
                const options = {
                    width: 100,
                    height: 100,
                    noImplicitAtomLabelColors: true, // Render atom labels in black
                    suppressChiralText: true,         // Remove chiral indicators if desired
                    noStereoProblem: true,
                    suppressCIPParity: true,
                    useGlobalAtomFontSize: true,
                    atomFontSize: 8,
                    strokeWidth: 1,
                    mapReactionAtoms: true,
                    compactDrawing: true,
                    suppressESR: true,
                };

                const svg = molecule.toSVG(options.width, options.height, undefined, options);

                // Modify SVG to ensure all strokes are black
                const blackSvg = svg.replace(/stroke="[^"]*"/g, 'stroke="#000"').replace(/fill="[^"]*"/g, 'fill="none"');

                // Construct the tile content
                tile.innerHTML = `
                    ${blackSvg}
                    <div class="tile-text">
                        <strong>${aminoAcid.name}</strong><br>
                        ${aminoAcid.abbr.three}, ${aminoAcid.abbr.one}
                    </div>
                `;
                tile.addEventListener("click", () => openCard(residue));
                container.appendChild(tile);
            });
        } catch (error) {
            console.error("Error loading amino acid data:", error);
        }
    }

    

    // Render 2D structure with OpenChemLib
    function render2D(smiles, targetElement) {
        try {
            const molecule = OCL.Molecule.fromSmiles(smiles);
            const options = {
                width: 200,
                height: 120,
                noImplicitAtomLabelColors: true, // Render atom labels in black
                suppressChiralText: true,        // Remove chiral indicators
                noStereoProblem: true,
                suppressCIPParity: true,
                useGlobalAtomFontSize: true,
                atomFontSize: 8,
                strokeWidth: 1,
                mapReactionAtoms: true,
                compactDrawing: true,
                suppressESR: true,
            };

            const svg = molecule.toSVG(options.width, options.height, undefined, options);

    
            // Modify SVG to ensure all strokes are white
            const whiteSvg = svg.replace(/stroke="[^"]*"/g, 'stroke="#FFF"').replace(/fill="[^"]*"/g, 'fill="none"');
    
            if (targetElement) {
                targetElement.innerHTML = whiteSvg;
            }
        } catch (error) {
            console.error("Error rendering 2D structure:", error);
        }
    }
    

    // Render 3D structure using 3Dmol.js and PubChem
    function render3D(residue) {
        try {
            const viewerElement = document.getElementById("viewer3d");
            if (!viewerElement) {
                console.error("3D viewer element not found");
                return;
            }
    
            // Clear any existing content
            viewerElement.innerHTML = "";
    
            // Initialize the 3Dmol.js viewer
            const viewer = $3Dmol.createViewer(viewerElement, { backgroundColor: 'white' });
    
            // Build the path to the SDF file
            const sdfFileName = `${residue}.sdf`; // Assuming residue is the three-letter code, e.g., "ALA"
            const url = `data/sdf/${sdfFileName}`;
    
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Failed to load SDF file");
                    }
                    return response.text();
                })
                .then(sdfData => {
                    viewer.addModel(sdfData, "sdf");
                    viewer.setStyle({}, { stick: {} });
                    viewer.zoomTo();
                    viewer.render();
                })
                .catch(error => {
                    console.error("Error fetching 3D structure:", error);
                    alert("3D structure not available for this amino acid.");
                });
        } catch (error) {
            console.error("Error initializing 3D view:", error);
        }
    }
    

    
    

    // Open the amino acid card and render 2D view by default
    function openCard(residue) {
        const data = aminoAcidData[residue];
        if (data) {
            currentResidue = residue;
            is2DView = true;

            // Clone the template and populate it with the amino acid data
            const template = document.getElementById("amino-acid-card-template");
            const clone = template.content.cloneNode(true);
            const aminoAcidCard = clone.querySelector(".card");

            // Set up the 2D and 3D view elements and toggle button
            const view2D = aminoAcidCard.querySelector(".view-2d");
            const view3D = aminoAcidCard.querySelector(".view-3d");
            const toggleViewButton = aminoAcidCard.querySelector(".toggle-view");

            // Render the 2D structure inside the cloned card's `view-2d` container
            render2D(data.smiles, view2D);

            // Populate the card with amino acid information
            const aminoAcidInfo = aminoAcidCard.querySelector(".amino-acid-info");
            aminoAcidInfo.innerHTML = ""; // Clear existing content

            Object.keys(data).forEach(key => {
                if (typeof data[key] === "object" && data[key] !== null) {
                    aminoAcidInfo.innerHTML += `<strong>${capitalizeFirstLetter(key)}:</strong><br>`;
                    Object.keys(data[key]).forEach(subKey => {
                        aminoAcidInfo.innerHTML += `&emsp;<strong>${capitalizeFirstLetter(subKey)}:</strong> ${data[key][subKey]}<br>`;
                    });
                } else {
                    aminoAcidInfo.innerHTML += `<strong>${capitalizeFirstLetter(key)}:</strong> ${data[key]}<br>`;
                }
            });

            // Position the card near the clicked tile
            const tile = document.querySelector(`[data-residue="${residue}"]`);
            const tileRect = tile.getBoundingClientRect();
            aminoAcidCard.style.position = "absolute";
            aminoAcidCard.style.left = `${tileRect.right + 10}px`;
            aminoAcidCard.style.top = `${tileRect.top}px`;

            // Add event listeners for the toggle view and close button
            toggleViewButton.addEventListener("click", toggleView);
            aminoAcidCard.querySelector(".close-card").addEventListener("click", () => {
                aminoAcidCard.remove();
                openCards = openCards.filter(card => card !== aminoAcidCard); // Remove card from openCards array
            });

            // Make the card draggable
            makeCardDraggable(aminoAcidCard);

            // Append the cloned card to the body
            document.body.appendChild(aminoAcidCard);

            // Add the card to the openCards array
            openCards.push(aminoAcidCard);

            // If more than 3 cards are open, close the oldest one
            if (openCards.length > 3) {
                const oldestCard = openCards.shift(); // Remove the oldest card from the array
                oldestCard.remove(); // Remove the card from the DOM
            }

            // Initial view settings for 2D and 3D
            if (view2D) view2D.style.display = "block";
            if (view3D) view3D.style.display = "none";
            if (toggleViewButton) toggleViewButton.textContent = "Switch to 3D View";
        }
    }

    // Helper function to capitalize the first letter of a key
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1).replace(/_/g, ' ');
    }

    // Toggle between 2D and 3D views
    function toggleView() {
        const data = aminoAcidData[currentResidue];
        if (data) {
            is2DView = !is2DView;
    
            const view2D = document.getElementById("view-2d");
            const view3D = document.getElementById("view-3d");
            const toggleViewButton = document.getElementById("toggle-view");
    
            if (is2DView) {
                view2D.style.display = "block";
                view3D.style.display = "none";
                toggleViewButton.textContent = "Switch to 3D View";
            } else {
                view2D.style.display = "none";
                view3D.style.display = "block";
                toggleViewButton.textContent = "Switch to 2D View";
    
                // Delay to allow the browser to render the element
                setTimeout(() => {
                    render3D(currentResidue); // Pass the residue code
                }, 0);
            }
        }
    }
    
    
    
    
    
    
    
    // Close the amino acid card
    function closeCard() {
        const aminoAcidCard = document.getElementById("amino-acid-card");
        if (aminoAcidCard) {
            aminoAcidCard.classList.add("hidden");
        }
    }

    // Attach global references for onclick handlers
    window.toggleView = toggleView;
    window.closeCard = closeCard;

    loadAminoAcidData();
});
