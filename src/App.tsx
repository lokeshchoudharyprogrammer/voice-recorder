
import './App.css';

import Recorder from "voice-recorder-react";
import RecordUi from './Recorder/RecordUi';

function App() {
  return (
    <div className="App">     
      <Recorder Render={RecordUi} />
    </div>
  );
}

export default App;
