/**
 * Performance Anti-patterns Rule
 * 
 * Detects common performance anti-patterns in code.
 */

import { IRule, RuleContext, RuleConfig, RuleResult } from '../rule.interface.js';
import { Violation } from '../../../types/core.types.js';

interface PerformanceConfig extends RuleConfig {
  checkN1Queries?: boolean;
  checkUnboundedLoops?: boolean;
  checkMemoryLeaks?: boolean;
  maxLoopDepth?: number;
}

export class PerformanceAntipatternsRule implements IRule {
  readonly id = 'performance-antipatterns';
  readonly name = 'Performance Anti-patterns';
  readonly description = 'Detects common performance anti-patterns in code';
  readonly severity = 'warning' as const;
  readonly tags = ['performance', 'optimization', 'best-practices'];

  private config: PerformanceConfig = {
    enabled: true,
    severity: 'warning',
    checkN1Queries: true,
    checkUnboundedLoops: true,
    checkMemoryLeaks: true,
    maxLoopDepth: 3,
  };

  configure(options: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...options };
  }

  async check(context: RuleContext): Promise<RuleResult> {
    const violations: Violation[] = [];

    for (const nodeId of context.graph.nodes()) {
      const node = context.getNodeData(nodeId);
      if (!node) continue;

      const filePath = node.data.relativePath;
      const content = context.fileContents?.get(filePath);
      if (!content) continue;

      if (this.config.checkN1Queries) {
        this.checkN1QueryPattern(filePath, content, violations);
      }
      if (this.config.checkUnboundedLoops) {
        this.checkUnboundedLoops(filePath, content, violations);
      }
      if (this.config.checkMemoryLeaks) {
        this.checkMemoryLeakPatterns(filePath, content, violations);
      }
      this.checkSyncOperations(filePath, content, violations);
    }

    return { violations };
  }

  private checkN1QueryPattern(filePath: string, content: string, violations: Violation[]): void {
    const lines = content.split('\n');
    let inLoop = false;
    let loopStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect loop start
      if (/\b(for|while|forEach|map|reduce|filter)\s*[([]/.test(line)) {
        inLoop = true;
        loopStartLine = i + 1;
      }

      // Detect query/fetch inside loop
      if (inLoop) {
        if (/\.find\(|\.findOne\(|\.query\(|\.execute\(|await\s+fetch\(|axios\.\w+\(/.test(line)) {
          violations.push(this.createViolation(
            filePath,
            'Potential N+1 query pattern detected',
            i + 1,
            'Consider using batch queries, eager loading, or data loaders'
          ));
        }

        // Detect loop end (simplified)
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;
        if (closeBraces > openBraces) {
          inLoop = false;
        }
      }
    }
  }

  private checkUnboundedLoops(filePath: string, content: string, violations: Violation[]): void {
    const lines = content.split('\n');
    let currentDepth = 0;
    const maxDepth = this.config.maxLoopDepth || 3;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/\b(for|while|do)\s*[({]/.test(line)) {
        currentDepth++;
        if (currentDepth > maxDepth) {
          violations.push(this.createViolation(
            filePath,
            `Deep nested loops detected (depth: ${currentDepth})`,
            i + 1,
            'Consider refactoring to reduce loop nesting or use different algorithms'
          ));
        }
      }

      // Check for while(true) or infinite loops
      if (/while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/.test(line)) {
        violations.push(this.createViolation(
          filePath,
          'Potentially infinite loop detected',
          i + 1,
          'Ensure proper exit conditions exist'
        ));
      }

      if (line.includes('}')) {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }
  }

  private checkMemoryLeakPatterns(filePath: string, content: string, violations: Violation[]): void {
    const lines = content.split('\n');

    // Pre-compute file-level cleanup indicators
    const hasRemoveEventListener = content.includes('removeEventListener') || content.includes('.off(');
    const hasAbortController = content.includes('AbortController') || content.includes('signal');

    // Detect if this is a React component file (useEffect handles cleanup via return)
    const isReactFile = /\buseEffect\b/.test(content) || /\bcomponentWillUnmount\b/.test(content);

    // Track which event-listener lines are inside a useEffect (React cleanup pattern)
    const useEffectRanges: Array<{ start: number; end: number }> = [];
    if (isReactFile) {
      const effectPattern = /useEffect\s*\(/g;
      let m;
      while ((m = effectPattern.exec(content)) !== null) {
        const startLine = content.substring(0, m.index).split('\n').length;
        // Find the matching closing of the useEffect call (rough heuristic)
        let depth = 0;
        let inEffect = false;
        let endLine = startLine;
        for (let k = m.index; k < content.length; k++) {
          if (content[k] === '(') { depth++; inEffect = true; }
          if (content[k] === ')') { depth--; }
          if (inEffect && depth === 0) {
            endLine = content.substring(0, k).split('\n').length;
            break;
          }
        }
        useEffectRanges.push({ start: startLine, end: endLine });
      }
    }

    const reportedEventListenerOnce = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for event listeners without cleanup
      if (/addEventListener\s*\(|\.on\s*\(/.test(line)) {
        // Skip if file already has matching cleanup
        if (hasRemoveEventListener || hasAbortController) continue;

        // Skip if inside React useEffect (cleanup handled by return function)
        const insideEffect = useEffectRanges.some(r => lineNum >= r.start && lineNum <= r.end);
        if (insideEffect) continue;

        // Avoid duplicate warnings for same event type in same file
        const eventMatch = line.match(/(?:addEventListener|\.on)\s*\(\s*['"`](\w+)['"`]/);
        const eventKey = eventMatch ? eventMatch[1] : `line-${lineNum}`;
        if (reportedEventListenerOnce.has(eventKey)) continue;
        reportedEventListenerOnce.add(eventKey);

        violations.push(this.createViolation(
          filePath,
          'Event listener without apparent cleanup',
          lineNum,
          'Ensure event listeners are removed in cleanup/unmount, or use AbortController signal'
        ));
      }

      // Check for setInterval without clearInterval
      if (/setInterval\s*\(/.test(line)) {
        if (!content.includes('clearInterval')) {
          violations.push(this.createViolation(
            filePath,
            'setInterval without clearInterval',
            lineNum,
            'Store interval ID and clear it during cleanup'
          ));
        }
      }

      // Check for large array accumulation in loops — only flag when there's
      // strong evidence of unbounded growth (push inside while/for with no guard)
      if (/\.push\s*\(/.test(line)) {
        // Look at the 15 surrounding lines for a loop construct
        const contextStart = Math.max(0, i - 15);
        const contextEnd = Math.min(lines.length, i + 5);
        const localContext = lines.slice(contextStart, contextEnd).join('\n');

        const inLoop = /\b(while|for)\s*\(/.test(localContext);
        if (inLoop) {
          // Only flag if there's NO size guard in the surrounding context
          const hasSizeGuard = /\.length\s*[<>]|\.slice\(|\.splice\(|\.shift\(|\.pop\(|break\b|return\b/.test(localContext);
          if (!hasSizeGuard) {
            violations.push(this.createViolation(
              filePath,
              'Array accumulation in loop without apparent size limit',
              lineNum,
              'Consider adding size limits, pagination, or using streaming'
            ));
            break; // Only report once per file
          }
        }
      }
    }
  }

  private checkSyncOperations(filePath: string, content: string, violations: Violation[]): void {
    const lines = content.split('\n');
    const syncPatterns = [
      { pattern: /readFileSync\s*\(/, name: 'readFileSync' },
      { pattern: /writeFileSync\s*\(/, name: 'writeFileSync' },
      { pattern: /execSync\s*\(/, name: 'execSync' },
      { pattern: /spawnSync\s*\(/, name: 'spawnSync' },
    ];

    for (let i = 0; i < lines.length; i++) {
      for (const { pattern, name } of syncPatterns) {
        if (pattern.test(lines[i])) {
          violations.push(this.createViolation(
            filePath,
            `Synchronous operation '${name}' may block event loop`,
            i + 1,
            `Consider using async version or worker threads`
          ));
        }
      }
    }
  }

  private createViolation(file: string, message: string, line: number, suggestion?: string): Violation {
    return {
      id: `${this.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: this.id,
      ruleName: this.name,
      severity: 'warning',
      message,
      file,
      line,
      suggestion,
    };
  }
}
