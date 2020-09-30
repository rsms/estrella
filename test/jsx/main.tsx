import * as React from "react"
import * as ReactDOM from "react-dom"

class App extends React.Component {
  render(): React.ReactNode {
    return <h1>Hello, world!</h1>
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
)
