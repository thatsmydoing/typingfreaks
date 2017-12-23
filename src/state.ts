/**
 * This module is a simple state machine implementation. We model states as a
 * graph, and the state machine simply keeps track of the current and final
 * state. The state also has a display field as metadata. This serves as the
 * state name and is also used to represent the remaining text to be input at
 * that particular state.
 *
 * The only other important thing to note is the extend method. This is solely
 * for handling っ. Essentially, it "doubles" the first letter of the current
 * state by creating a new state and intermediate states for each transition out
 * it has. A state with multiple transitions essentially means it has multiple
 * different spellings, so it's important to name the intermediate states
 * correctly.
 */
namespace state {
  export enum TransitionResult { FAILED, SUCCESS, FINISHED }

  interface StateMap {
    [index: string]: State
  }

  interface StateTransitionList {
    [index: string]: State
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

    extend(): State {
      let extendedDisplay = this.display.charAt(0) + this.display;
      let newState = new State(extendedDisplay);

      Object.keys(this.transitions).forEach(k => {
        let nextState = this.transitions[k];
        let intermediateDisplay = k + nextState.display;
        let intermediateState = new State(intermediateDisplay);
        intermediateState.addTransition(k, nextState);
        newState.addTransition(k, intermediateState);
      })

      return newState;
    }

    transition(input: string): State | null {
      return this.transitions[input];
    }
  }

  export class StateMachine {
    initialState: State;
    finalState: State;
    currentState: State;

    constructor(initialState: State, finalState: State) {
      this.initialState = initialState;
      this.currentState = initialState;
      this.finalState = finalState;
    }

    transition(input: string): TransitionResult {
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

    isFinished(): boolean {
      return this.currentState === this.finalState;
    }

    reset(): void {
      this.currentState = this.initialState;
    }

    clone(): StateMachine {
      return new StateMachine(this.initialState, this.finalState);
    }

    extend(): StateMachine {
      let newInitialState = this.initialState.extend();
      return new StateMachine(newInitialState, this.finalState);
    }

    getWord(): string {
      return this.initialState.display;
    }

    getDisplay(): string {
      return this.currentState.display;
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
