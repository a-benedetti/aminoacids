document.addEventListener("DOMContentLoaded", function () {
    let currentResidue = "";
    let is2DView = true;
    let aminoAcidData = {};

    // Load amino acid data and populate tiles
    async function loadAminoAcidData() {
        try {
            const response = await fetch("data/amino_acids.json");
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
                tile.className = `amino-acid tile-${aminoAcid.polarity.replace(" ", "-").toLowerCase()}`;
                tile.dataset.residue = residue;
    
                // Generate the SVG image using OpenChemLib
                const molecule = OCL.Molecule.fromSmiles(aminoAcid.smiles);
    
                // Configure rendering options
                const options = {
                    width: 100,
                    height: 100,
                    noImplicitAtomLabelColors: true, // Render atom labels in black
                    suppressChiralText: true,         // Remove chiral indicators if desired
                    useGlobalAtomFontSize: true,
                    atomFontSize: 8,
                    strokeWidth: 1,
                    mapReactionAtoms: false,
                    compactDrawing: false,
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
    function render2D(smiles) {
        try {
            const molecule = OCL.Molecule.fromSmiles(smiles);
            const svg = molecule.toSVG(200, 200);
            const view2D = document.getElementById("view-2d");
            if (view2D) {
                view2D.innerHTML = svg;
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

            render2D(data.smiles); // Render 2D structure

            const aminoAcidInfo = document.getElementById("amino-acid-info");
            if (aminoAcidInfo) {
                aminoAcidInfo.innerHTML = `
                    <strong>Name:</strong> ${data.name}<br>
                    <strong>Abbreviations:</strong> ${data.abbr.three}, ${data.abbr.one}<br>
                    <strong>Formula:</strong> ${data.formula}<br>
                    <strong>Molecular Weight:</strong> ${data.weight}<br>
                    <strong>Polarity:</strong> ${data.polarity}<br>
                    <strong>Hydropathy Index:</strong> ${data.hydropathyIndex}<br>
                    <strong>Charge:</strong> ${data.charge}<br>
                    <strong>Side Chain:</strong> ${data.sideChain}<br>
                    <strong>SMILES:</strong> ${data.smiles}<br>
                    <strong>InChI:</strong> ${data.inchi}<br>
                    <strong>Biochemical Role:</strong> ${data.biochemicalRole}<br>
                    <strong>Essentiality:</strong> ${data.essentiality}<br>
                    <strong>Codons:</strong> ${data.codons}<br>
                `;
            }

            const aminoAcidCard = document.getElementById("amino-acid-card");
            if (aminoAcidCard) {
                aminoAcidCard.classList.remove("hidden");
            }
            const view2D = document.getElementById("view-2d");
            const view3D = document.getElementById("view-3d");
            const toggleViewButton = document.getElementById("toggle-view");
            if (view2D) view2D.style.display = "block";
            if (view3D) view3D.style.display = "none";
            if (toggleViewButton) toggleViewButton.textContent = "Switch to 3D View";
        }
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
