import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { createLanguageService, getLanguageService } from './out/index.js';
import { URI } from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Create a simple in-memory workspace
class SimpleWorkspace {
  private docs = new Map<string, string>();
  
  constructor(workspacePath: string) {
    // Load all .md files from workspace
    const files = fs.readdirSync(workspacePath).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(workspacePath, file), 'utf-8');
      this.docs.set(file, content);
    }
    console.log('Loaded files:', [...this.docs.keys()]);
  }

  hasMarkdownDocument(uri: URI): boolean {
    return this.docs.has(uri.path);
  }

  getAllMarkdownUris(): URI[] {
    return [...this.docs.keys()].map(f => URI.file(path.join('/test-workspace', f)));
  }

  getDocument(uri: URI): TextDocument | undefined {
    const content = this.docs.get(path.basename(uri.path));
    if (content) {
      return TextDocument.create(uri.toString(), 'markdown', 1, content);
    }
    return undefined;
  }

  async stat(uri: URI): Promise<{ isDirectory: boolean } | undefined> {
    const basename = path.basename(uri.path);
    if (this.docs.has(basename)) {
      return { isDirectory: false };
    }
    return undefined;
  }

  async readDirectory(uri: URI): Promise<[string, { isDirectory: boolean }][]> {
    return [];
  }

  folderExists(uri: URI): boolean {
    return true;
  }

  getConfiguration() {
    return {
      languageId: 'markdown',
      paths: [],
      preferredMdPathExtensionBehaviors: {},
      useWorkspaceTrust: false,
    };
  }
}

// Test function
async function testDiagnostics() {
  const workspacePath = path.join(process.cwd(), 'test-workspace');
  console.log('Testing workspace:', workspacePath);
  
  const workspace = new SimpleWorkspace(workspacePath);
  
  // Create language service
  const ls = createLanguageService({
    workspace,
    logger: {
      log: (level: any, message: any) => console.log('[LOG]', message),
    },
  });
  
  // Test document
  const testUri = URI.file(path.join(workspacePath, 'test.md'));
  const document = workspace.getDocument(testUri);
  
  if (!document) {
    console.error('Document not found!');
    return;
  }
  
  console.log('\n=== Testing Diagnostics ===\n');
  console.log('Document content:');
  console.log(document.getText());
  console.log('\n--- Running diagnostics ---\n');
  
  // Get diagnostics
  const diagnostics = await ls.getDiagnostics({
    uri: testUri.toString(),
    version: document.version,
  });
  
  console.log(`Found ${diagnostics.length} diagnostic(s):\n`);
  
  for (const d of diagnostics) {
    const line = document.positionAt(d.range.start);
    console.log(`Line ${line.line + 1}: ${d.message}`);
  }
  
  if (diagnostics.length === 0) {
    console.log('No diagnostics found (check if file paths exist)');
  }
}

testDiagnostics().catch(console.error);
