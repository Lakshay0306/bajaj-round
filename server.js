const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// User Details (Change these)
const USER_ID = "lakshay_01012003";
const EMAIL_ID = "lakshay0723.be23@chitkara.edu.in";
const COLLEGE_ROLL_NUMBER = "2310990723";

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/bfhl' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (!parsed.data || !Array.isArray(parsed.data)) {
           res.writeHead(400, { 'Content-Type': 'application/json' });
           return res.end(JSON.stringify({ error: "Invalid input, expected { data: [] }" }));
        }
        
        const result = processBfhl(parsed.data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  } else if (req.url === '/' && req.method === 'GET') {
    serveFile(res, '/public/index.html', 'text/html');
  } else if (req.url === '/style.css' && req.method === 'GET') {
    serveFile(res, '/public/style.css', 'text/css');
  } else if (req.url === '/script.js' && req.method === 'GET') {
    serveFile(res, '/public/script.js', 'application/javascript');
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

function serveFile(res, filePath, contentType) {
  const fullPath = path.join(__dirname, filePath);
  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading file');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

function processBfhl(data) {
  const invalid_entries = [];
  const duplicate_edges = [];
  const seen_edges = new Set();
  const added_to_duplicate = new Set();
  const valid_edges = [];

  for (let str of data) {
    if (typeof str !== 'string') {
      invalid_entries.push(String(str));
      continue;
    }
    str = str.trim();
    if (!/^([A-Z])->([A-Z])$/.test(str)) {
      invalid_entries.push(str);
      continue;
    }
    const u = str[0];
    const v = str[3];
    if (u === v) {
      invalid_entries.push(str);
      continue;
    }
    if (seen_edges.has(str)) {
      if (!added_to_duplicate.has(str)) {
        duplicate_edges.push(str);
        added_to_duplicate.add(str);
      }
      continue;
    }
    seen_edges.add(str);
    valid_edges.push({ u, v, str });
  }

  const children = {};
  const parent = {};
  const nodes = new Set();

  for (const { u, v } of valid_edges) {
    nodes.add(u);
    nodes.add(v);
    if (parent[v] === undefined) {
      parent[v] = u;
      if (!children[u]) children[u] = [];
      children[u].push(v);
    }
  }

  const roots = [];
  for (const node of nodes) {
    if (parent[node] === undefined) {
      roots.push(node);
    }
  }
  roots.sort();

  const visited = new Set();
  const hierarchies = [];

  function buildTree(node) {
    visited.add(node);
    const treeObj = {};
    let maxDepth = 0;
    if (children[node]) {
      const sortedChildren = [...children[node]].sort();
      for (const child of sortedChildren) {
        const childRes = buildTree(child);
        treeObj[child] = childRes.tree;
        maxDepth = Math.max(maxDepth, childRes.depth);
      }
    }
    return { tree: treeObj, depth: 1 + maxDepth };
  }

  for (const root of roots) {
    const res = buildTree(root);
    hierarchies.push({
      root: root,
      tree: { [root]: res.tree },
      depth: res.depth
    });
  }

  const unvisitedNodes = [...nodes].filter(n => !visited.has(n));
  const unvisitedSet = new Set(unvisitedNodes);

  while (unvisitedSet.size > 0) {
    const start = unvisitedSet.values().next().value;
    
    let curr = start;
    const trace = [];
    const traceSet = new Set();
    while (!traceSet.has(curr)) {
      trace.push(curr);
      traceSet.add(curr);
      curr = parent[curr];
    }
    
    const cycleStartIndex = trace.indexOf(curr);
    const cycleNodes = trace.slice(cycleStartIndex);
    const cycleRoot = cycleNodes.sort()[0];

    hierarchies.push({
      root: cycleRoot,
      tree: {},
      has_cycle: true
    });

    const q = [start];
    visited.add(start);
    unvisitedSet.delete(start);
    
    while (q.length > 0) {
      const node = q.shift();
      if (parent[node] && !visited.has(parent[node])) {
        visited.add(parent[node]);
        unvisitedSet.delete(parent[node]);
        q.push(parent[node]);
      }
      if (children[node]) {
        for (const child of children[node]) {
          if (!visited.has(child)) {
            visited.add(child);
            unvisitedSet.delete(child);
            q.push(child);
          }
        }
      }
    }
  }

  let total_trees = 0;
  let total_cycles = 0;
  let largest_tree_root = null;
  let max_depth = 0;

  for (const h of hierarchies) {
    if (h.has_cycle) {
      total_cycles++;
    } else {
      total_trees++;
      if (h.depth > max_depth) {
        max_depth = h.depth;
        largest_tree_root = h.root;
      } else if (h.depth === max_depth) {
        if (largest_tree_root === null || h.root < largest_tree_root) {
          largest_tree_root = h.root;
        }
      }
    }
  }

  return {
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL_NUMBER,
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees,
      total_cycles,
      largest_tree_root: largest_tree_root || null
    }
  };
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
