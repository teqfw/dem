// @ts-check
/**
 * @namespace TeqFw_Dem_Compile_A_Graph
 * @description Deterministic dependency edges and strongly connected entity components.
 */
export default class Graph {
    /** Initialize component behavior. */
    constructor() {
        /**
         * @param {TeqFw_Dem_Model} model
         * @returns {TeqFw_Dem_Graph}
         */
        this.exec = function (model) {
            const nodes = Object.keys(model.entities).sort();
            const adjacency = new Map(nodes.map(n => [n, [...new Set(Object.values(model.entities[n].relations).map(r => r.target.path))].sort()]));
            const edges = nodes.flatMap(from => (adjacency.get(from) ?? []).map(to => ({ from, to })));
            const indices = new Map(), low = new Map(), onStack = new Set();
            /** @type {Array<string>} */ const stack = [];
            /** @type {string[][]} */ const components = [];
            let index = 0;
            /** @param {string} node */
            const visit = function (node) {
                indices.set(node, index);
                low.set(node, index++);
                stack.push(node);
                onStack.add(node);
                for (const next of adjacency.get(node) ?? []) {
                    if (!indices.has(next)) {
                        visit(next);
                        low.set(node, Math.min(low.get(node), low.get(next)));
                    }
                    else if (onStack.has(next))
                        low.set(node, Math.min(low.get(node), indices.get(next)));
                }
                if (low.get(node) === indices.get(node)) {
                    const component = [];
                    let current;
                    do {
                        current = /** @type {string} */ (stack.pop());
                        onStack.delete(current);
                        component.push(current);
                    } while (current !== node);
                    components.push(component.sort());
                }
            };
            for (const node of nodes)
                if (!indices.has(node))
                    visit(node);
            components.sort((a, b) => a[0] < b[0] ? -1 : 1);
            return { edges, components };
        };
    }
}
