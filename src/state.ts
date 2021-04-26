/**
 * This module is a simple state machine implementation. We model states as a
 * graph, and the state machine simply keeps track of the current and final
 * state. The state also has a display field as metadata. This serves as the
 * state name and is also used to represent the remaining text to be input at
 * that particular state.
 */

export enum TransitionResult {
  FAILED,
  SUCCESS,
  SKIPPED,
}

interface StateMap<Meta> {
  [index: string]: State<Meta>;
}

interface StateTransitionList<Meta> {
  [index: string]: State<Meta>;
}

export interface Observer<Meta> {
  (result: TransitionResult, meta: Meta, finished: boolean): void;
}

export class State<Meta> {
  display: string;
  meta: Meta;
  transitions: StateTransitionList<Meta>;

  constructor(display: string, meta: Meta) {
    this.display = display;
    this.meta = meta;
    this.transitions = {};
  }

  addTransition(input: string, state: State<Meta>): void {
    this.transitions[input] = state;
  }

  transition(input: string): State<Meta> | undefined {
    return this.transitions[input];
  }

  merge(other: State<Meta>): State<Meta> {
    const newState = this.clone();
    for (const key in other.transitions) {
      const otherNextState = other.transitions[key];
      const thisNextState = this.transition(key);
      if (thisNextState === undefined) {
        newState.addTransition(key, otherNextState);
      } else {
        newState.addTransition(key, thisNextState.merge(otherNextState));
      }
    }
    return newState;
  }

  transform(fn: (state: State<Meta>) => [string, Meta]): State<Meta> {
    const [newDisplay, newMeta] = fn(this);
    const newState = new State(newDisplay, newMeta);
    for (const key in this.transitions) {
      newState.transitions[key] = this.transitions[key].transform(fn);
    }
    return newState;
  }

  closure(): Set<State<Meta>> {
    const closure: Set<State<Meta>> = new Set([this]);
    for (const key in this.transitions) {
      const nextState = this.transitions[key];
      if (!closure.has(nextState)) {
        nextState.closure().forEach((state) => {
          closure.add(state);
        });
      }
    }
    return closure;
  }

  isEnd(): boolean {
    return Object.values(this.transitions).length === 0;
  }

  clone(): State<Meta> {
    const state = new State(this.display, this.meta);
    state.transitions = { ...this.transitions };
    return state;
  }

  debug(name?: string): this {
    if (name) {
      console.group(name);
    }
    this.closure().forEach((state) => console.log(state.toJSON()));
    if (name) {
      console.groupEnd();
    }
    return this;
  }

  toJSON(): string {
    const transitions = [];
    for (const key in this.transitions) {
      transitions.push(`${key}->${this.transitions[key].display}`);
    }
    return `${this.display}(${this.meta}): ${transitions.join(',')}`;
  }
}

export class MetaStateMachine<Meta> {
  initialState: State<Meta>;
  currentState: State<Meta>;
  observers: Set<Observer<Meta>>;
  nextMachine: MetaStateMachine<Meta> | null;

  constructor(initialState: State<Meta>) {
    this.initialState = initialState;
    this.currentState = initialState;
    this.observers = new Set();
    this.nextMachine = null;
  }

  transition(input: string) {
    const nextState = this.currentState.transition(input);
    if (nextState === undefined) {
      this.skipTransition(input);
    } else {
      this.currentState = nextState;
      this.notifyResult(
        TransitionResult.SUCCESS,
        this.currentState.meta,
        this.currentState.isEnd()
      );
    }
  }

  private skipTransition(input: string): boolean {
    let potentialNextStates: Array<State<Meta>> = Object.keys(
      this.currentState.transitions
    ).map((k) => this.currentState.transitions[k]);
    for (let i = 0; i < potentialNextStates.length; ++i) {
      const state = potentialNextStates[i];
      if (state.isEnd()) {
        if (this.nextMachine != null) {
          let result = this.nextMachine.initialState.transition(input);
          if (result != null) {
            const newState = result;
            this.currentState = state;
            this.nextMachine.currentState = newState;
            this.notifyResult(
              TransitionResult.SKIPPED,
              state.meta,
              state.isEnd()
            );
            this.nextMachine.notifyResult(
              TransitionResult.SUCCESS,
              newState.meta,
              newState.isEnd()
            );
            return true;
          }
        }
      } else {
        let result = state.transition(input);
        if (result != null) {
          const newState = result;
          this.currentState = newState;
          this.notifyResult(
            TransitionResult.SKIPPED,
            state.meta,
            state.isEnd()
          );
          this.notifyResult(
            TransitionResult.SUCCESS,
            newState.meta,
            newState.isEnd()
          );
          return true;
        }
      }
    }
    this.notifyResult(TransitionResult.FAILED, this.currentState.meta, false);
    return false;
  }

  isNew(): boolean {
    return this.currentState === this.initialState;
  }

  isFinished(): boolean {
    return this.currentState.isEnd();
  }

  reset(): void {
    this.currentState = this.initialState;
  }

  clone(): MetaStateMachine<Meta> {
    return new MetaStateMachine(this.initialState);
  }

  getWord(): string {
    return this.initialState.display;
  }

  getDisplay(): string {
    return this.currentState.display;
  }

  addObserver(observer: Observer<Meta>): void {
    this.observers.add(observer);
  }

  removeObserver(observer: Observer<Meta>): void {
    this.observers.delete(observer);
  }

  notifyResult(result: TransitionResult, meta: Meta, finished: boolean): void {
    this.observers.forEach((o) => o(result, meta, finished));
  }

  debug(): this {
    this.initialState.debug(this.initialState.display);
    return this;
  }
}

export interface Transition {
  from: string;
  input: string;
  to: string;
  meta: number;
}

export class StateMachine extends MetaStateMachine<number> {}

export function buildFromTransitions(
  initial: string,
  transitions: Transition[]
): StateMachine {
  let states: StateMap<number> = {};
  function getState(name: string, meta: number): State<number> {
    if (states[name] === undefined) {
      states[name] = new State(name, meta);
    }
    return states[name];
  }
  transitions.forEach((t) => {
    let fromState = getState(t.from, 0);
    let toState = getState(t.to, Math.max(fromState.meta, t.meta));
    fromState.addTransition(t.input, toState);
  });
  let initialState = getState(initial, 0);
  return new StateMachine(initialState);
}

export function mergeMachines(...machines: StateMachine[]): StateMachine {
  const newState = machines
    .map((machine) => machine.initialState)
    .reduce((acc, state) => acc.merge(state));
  return new StateMachine(newState);
}

export function appendMachines(...machines: StateMachine[]): StateMachine {
  const newState = machines
    .map((machine) => machine.initialState)
    .reduce(appendStates);
  return new StateMachine(newState);
}

export function makeTransition(
  from: string,
  input: string,
  to: string,
  meta: number = 0
): Transition {
  return { from, input, to, meta };
}

export function appendStates(
  a: State<number>,
  b: State<number>
): State<number> {
  const newState = a.transform((state) => {
    return [state.display + b.display, state.meta];
  });
  const finalStates: Set<State<number>> = new Set();
  let lastMeta = 0;
  for (const state of newState.closure()) {
    if (state.isEnd()) {
      lastMeta = state.meta;
      finalStates.add(state);
    }
  }
  const { transitions } = b.transform((state) => {
    return [state.display, state.meta + lastMeta];
  });
  finalStates.forEach((finalState) => {
    finalState.transitions = transitions;
  });
  return newState;
}
