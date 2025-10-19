/**
 * Markov Chain Visualization Module
 * Provides both graph visualization and transition matrix display
 */

import { MarkovChain } from "@src/core/MarkovChain";
import { MarkovState } from "@src/types";

export class MarkovVisualization {
  private container: HTMLElement;
  private network: any = null;
  private visLoaded = false;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.loadVisLibrary();
  }

  /**
   * Load the Vis.js library dynamically
   */
  private async loadVisLibrary(): Promise<void> {
    if (this.visLoaded) return;

    return new Promise((resolve, reject) => {
      // Load Vis.js CSS
      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = "https://unpkg.com/vis-network@9.1.6/dist/vis-network.min.css";
      document.head.appendChild(cssLink);

      // Load Vis.js JavaScript
      const script = document.createElement("script");
      script.src = "https://unpkg.com/vis-network@9.1.6/dist/vis-network.min.js";
      script.onload = () => {
        this.visLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error("Failed to load Vis.js library"));
      document.head.appendChild(script);
    });
  }

  /**
   * Create a graph visualization of the Markov chain
   */
  async createGraphVisualization(markovChain: MarkovChain, container?: HTMLElement): Promise<void> {
    const targetContainer = container || this.container;
    if (!this.visLoaded) {
      await this.loadVisLibrary();
    }

    // Clear existing network
    if (this.network) {
      this.network.destroy();
    }

    const states = markovChain.getStates();
    if (states.length === 0) {
      targetContainer.innerHTML =
        '<div style="color: #6c757d; text-align: center; padding: 20px">No states to visualize</div>';
      return;
    }

    // Limit the number of states for better visualization
    const maxStates = 50;
    const statesToShow = states.slice(0, maxStates);

    if (states.length > maxStates) {
      console.warn(`Showing only first ${maxStates} states out of ${states.length} total states`);
    }

    // Create nodes
    const nodes = new (window as any).vis.DataSet(
      statesToShow.map((state) => ({
        id: state.id,
        label: this.formatStateLabel(state.id),
        group: this.getStateGroup(state),
        title: this.getStateTooltip(state),
        font: { size: 12 },
        shape: "ellipse",
        size: Math.max(15, Math.min(30, state.transitions.size * 2 + 10)),
      }))
    );

    // Create edges with probabilities
    const edges: any[] = [];
    const edgeMap = new Map<string, number>();

    statesToShow.forEach((state) => {
      state.transitions.forEach((probability, nextElement) => {
        // Find the target state
        const targetState = statesToShow.find(
          (s) => s.id.includes(nextElement) || nextElement.includes(s.id.split("|")[0])
        );

        if (targetState && targetState.id !== state.id) {
          const edgeKey = `${state.id}->${targetState.id}`;
          const existingWeight = edgeMap.get(edgeKey) || 0;
          edgeMap.set(edgeKey, existingWeight + probability);
        }
      });
    });

    // Convert edge map to edges array
    edgeMap.forEach((weight, edgeKey) => {
      const [from, to] = edgeKey.split("->");
      edges.push({
        from,
        to,
        width: Math.max(1, Math.min(10, weight * 10)),
        label: `${(weight * 100).toFixed(1)}%`,
        font: { size: 10 },
        color: {
          color: this.getEdgeColor(weight),
          highlight: "#ff6b6b",
        },
        smooth: {
          type: "continuous",
          roundness: 0.2,
        },
      });
    });

    const edgesDataSet = new (window as any).vis.DataSet(edges);

    // Network options
    const options = {
      width: "100%",
      height: "100%",
      nodes: {
        borderWidth: 2,
        shadow: true,
        font: {
          color: "#333",
          size: 12,
        },
      },
      edges: {
        arrows: {
          to: { enabled: true, scaleFactor: 0.8 },
        },
        font: {
          color: "#666",
          size: 10,
          background: "rgba(255,255,255,0.8)",
        },
        smooth: {
          type: "continuous",
        },
      },
      physics: {
        enabled: true,
        stabilization: { iterations: 100 },
        barnesHut: {
          gravitationalConstant: -2000,
          centralGravity: 0.1,
          springLength: 200,
          springConstant: 0.04,
          damping: 0.09,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
      },
      layout: {
        improvedLayout: true,
      },
    };

    // Create the network
    const data = { nodes: nodes, edges: edgesDataSet };
    this.network = new (window as any).vis.Network(targetContainer, data, options);

    // Add event listeners
    this.network.on("selectNode", (params: any) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        this.highlightNode(nodeId);
      }
    });

    this.network.on("deselectNode", () => {
      this.clearHighlights();
    });

    // Handle window resize
    const resizeHandler = () => {
      if (this.network) {
        this.network.redraw();
      }
    };
    window.addEventListener("resize", resizeHandler);

    // Store resize handler for cleanup
    (this as any).resizeHandler = resizeHandler;
  }

  /**
   * Create a transition matrix visualization
   */
  createTransitionMatrix(markovChain: MarkovChain, container?: HTMLElement): void {
    const targetContainer = container || this.container;
    const states = markovChain.getStates();
    if (states.length === 0) {
      targetContainer.innerHTML =
        '<div style="color: #6c757d; text-align: center; padding: 20px">No states to visualize</div>';
      return;
    }

    // Limit states for matrix display
    const maxStates = 20;
    const statesToShow = states.slice(0, maxStates);

    if (states.length > maxStates) {
      console.warn(`Showing only first ${maxStates} states out of ${states.length} total states`);
    }

    // Create matrix HTML
    let matrixHtml = '<div class="transition-matrix-container">';
    matrixHtml += "<h4>Transition Matrix</h4>";
    matrixHtml += '<div class="matrix-wrapper">';

    // Get all unique next elements from all states
    const allNextElements = new Set<string>();
    statesToShow.forEach((state) => {
      state.transitions.forEach((_, nextElement) => {
        allNextElements.add(nextElement);
      });
    });
    const nextElementsArray = Array.from(allNextElements).slice(0, maxStates);

    // Header row
    matrixHtml += '<div class="matrix-row header-row">';
    matrixHtml += '<div class="matrix-cell header-cell">From \\ To</div>';
    nextElementsArray.forEach((nextElement) => {
      matrixHtml += `<div class="matrix-cell header-cell">${nextElement}</div>`;
    });
    matrixHtml += "</div>";

    // Data rows
    statesToShow.forEach((fromState) => {
      matrixHtml += '<div class="matrix-row">';
      matrixHtml += `<div class="matrix-cell header-cell">${this.formatStateLabel(
        fromState.id
      )}</div>`;

      nextElementsArray.forEach((nextElement) => {
        const probability = fromState.transitions.get(nextElement) || 0;
        const cellClass = probability > 0 ? "data-cell" : "empty-cell";
        const cellStyle =
          probability > 0 ? `background-color: ${this.getProbabilityColor(probability)}` : "";

        matrixHtml += `<div class="matrix-cell ${cellClass}" style="${cellStyle}" title="From ${this.formatStateLabel(
          fromState.id
        )} to ${nextElement}: ${(probability * 100).toFixed(1)}%">`;
        matrixHtml += probability > 0 ? `${(probability * 100).toFixed(1)}%` : "-";
        matrixHtml += "</div>";
      });

      matrixHtml += "</div>";
    });

    matrixHtml += "</div>";
    matrixHtml += "</div>";

    // Add CSS for the matrix
    const matrixCSS = `
      <style>
        .transition-matrix-container {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          overflow-x: auto;
          margin: 10px 0;
        }
        
        .matrix-wrapper {
          display: inline-block;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          overflow: hidden;
        }
        
        .matrix-row {
          display: flex;
        }
        
        .matrix-cell {
          min-width: 60px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-right: 1px solid #dee2e6;
          border-bottom: 1px solid #dee2e6;
          font-size: 11px;
          font-weight: 500;
        }
        
        .matrix-cell:last-child {
          border-right: none;
        }
        
        .header-cell {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #495057;
        }
        
        .data-cell {
          color: #212529;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .data-cell:hover {
          transform: scale(1.05);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .empty-cell {
          color: #6c757d;
          background-color: #f8f9fa;
        }
      </style>
    `;

    targetContainer.innerHTML = matrixCSS + matrixHtml;
  }

  /**
   * Format state label for display
   */
  private formatStateLabel(stateId: string): string {
    // If state is too long, truncate it
    if (stateId.length > 15) {
      const parts = stateId.split("|");
      if (parts.length > 2) {
        return `${parts[0]}...${parts[parts.length - 1]}`;
      }
      return stateId.substring(0, 12) + "...";
    }
    return stateId;
  }

  /**
   * Get state group for coloring
   */
  private getStateGroup(state: MarkovState): number {
    const numTransitions = state.transitions.size;
    if (numTransitions === 0) return 0; // Dead end
    if (numTransitions === 1) return 1; // Deterministic
    if (numTransitions <= 3) return 2; // Low branching
    if (numTransitions <= 6) return 3; // Medium branching
    return 4; // High branching
  }

  /**
   * Get state tooltip
   */
  private getStateTooltip(state: MarkovState): string {
    const transitions = Array.from(state.transitions.entries())
      .map(([element, prob]) => `${element}: ${(prob * 100).toFixed(1)}%`)
      .join("\n");

    return `State: ${state.id}\nTransitions:\n${transitions}`;
  }

  /**
   * Get edge color based on probability
   */
  private getEdgeColor(probability: number): string {
    if (probability >= 0.8) return "#e74c3c"; // Red for high probability
    if (probability >= 0.5) return "#f39c12"; // Orange for medium-high
    if (probability >= 0.2) return "#f1c40f"; // Yellow for medium
    return "#95a5a6"; // Gray for low probability
  }

  /**
   * Get probability color for matrix cells
   */
  private getProbabilityColor(probability: number): string {
    return `rgba(52, 152, 219, ${0.2 + probability * 0.8})`;
  }

  /**
   * Highlight a specific node and its connections
   */
  private highlightNode(nodeId: string): void {
    // This would highlight the node and its connections
    // Implementation depends on specific highlighting requirements
    console.log(`Highlighting node: ${nodeId}`);
  }

  /**
   * Clear all highlights
   */
  private clearHighlights(): void {
    // Clear any highlighting
    console.log("Clearing highlights");
  }

  /**
   * Destroy the visualization
   */
  destroy(): void {
    if (this.network) {
      this.network.destroy();
      this.network = null;
    }

    // Clean up resize handler
    if ((this as any).resizeHandler) {
      window.removeEventListener("resize", (this as any).resizeHandler);
      (this as any).resizeHandler = null;
    }
  }
}

// Standalone functions for use in new tabs
export async function createGraphVisualization(
  noteChainData: any,
  container: HTMLElement
): Promise<void> {
  const visualization = new MarkovVisualization("dummy");

  // Reconstruct states from serialized data
  const states = noteChainData.states.map((stateData: any) => ({
    id: stateData.id,
    transitions: new Map(stateData.transitions),
  }));

  // Create a mock MarkovChain object from the note chain data
  const mockChain = {
    getStates: () => states,
    getTransitions: () => new Map(),
  } as any;

  await visualization.createGraphVisualization(mockChain, container);
}

export function createTransitionMatrix(noteChainData: any, container: HTMLElement): void {
  const visualization = new MarkovVisualization("dummy");

  // Reconstruct states from serialized data
  const states = noteChainData.states.map((stateData: any) => ({
    id: stateData.id,
    transitions: new Map(stateData.transitions),
  }));

  // Create a mock MarkovChain object from the note chain data
  const mockChain = {
    getStates: () => states,
    getTransitions: () => new Map(),
  } as any;

  visualization.createTransitionMatrix(mockChain, container);
}
