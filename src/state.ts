/**
 * This module is a simple state machine implementation. We model states as a
 * graph, and the state machine simply keeps track of the current and final
 * state. The state also has a display field as metadata. This serves as the
 * state name and is also used to represent the remaining text to be input at
 * that particular state.
 */
namespace state {
  export enum TransitionResult { FAILED, SUCCESS, FINISHED }

  interface StateMap {
    [index: string]: State
  }

  interface StateTransitionList {
    [index: string]: State
  }

  export interface Observer {
    (result: TransitionResult): void
  }

  export class State {
    display: string;
    transitions: StateTransitionList;

    constructor(display: string) {
      this.display = display;
      this.transitions = {};
    }

    addTransition(input: string, state: State): void {
      this.transitions[input] = state;
    }

    transition(input: string): State | null {
      return this.transitions[input];
    }

    clone(): State {
      let state = new State(this.display);
      state.transitions = {...this.transitions};
      return state;
    }
  }

  export class StateMachine {
    initialState: State;
    finalState: State;
    currentState: State;
    observers: Set<Observer>;

    constructor(initialState: State, finalState: State) {
      this.initialState = initialState;
      this.currentState = initialState;
      this.finalState = finalState;
      this.observers = new Set();
    }

    transition(input: string): TransitionResult {
      let result = this._transition(input);
      this.notify(result);
      return result;
    }

    private _transition(input: string): TransitionResult {
      let newState = this.currentState.transition(input);
      if (newState == null) {
        return TransitionResult.FAILED;
      } else {
        this.currentState = newState;
        if (this.finalState === newState) {
          return TransitionResult.FINISHED;
        } else {
          return TransitionResult.SUCCESS;
        }
      }
    }

    isNew(): boolean {
      return this.currentState === this.initialState;
    }

    isFinished(): boolean {
      return this.currentState === this.finalState;
    }

    reset(): void {
      this.currentState = this.initialState;
    }

    clone(): StateMachine {
      return new StateMachine(this.initialState, this.finalState);
    }

    getWord(): string {
      return this.initialState.display;
    }

    getDisplay(): string {
      return this.currentState.display;
    }

    addObserver(observer: Observer): void {
      this.observers.add(observer);
    }

    removeObserver(observer: Observer): void {
      this.observers.delete(observer);
    }

    notify(result: TransitionResult): void {
      this.observers.forEach(o => o(result));
    }
  }

  interface Transition {
    from: string,
    input: string,
    to: string
  }

  export function buildFromTransitions(initial: string, transitions: Transition[]): StateMachine {
    let states: StateMap = {};
    function getState(name: string): State {
      if (states[name] === undefined) {
        states[name] = new State(name);
      }
      return states[name];
    }
    transitions.forEach(t => {
      let fromState = getState(t.from);
      let toState = getState(t.to);
      fromState.addTransition(t.input, toState);
    })
    let initialState = getState(initial);
    let finalState = getState('');
    return new StateMachine(initialState, finalState);
  }

  export function makeTransition(from: string, input: string, to: string): Transition {
    return { from, input, to };
  }
}
