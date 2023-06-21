import { useEffect, useState, React } from "react";
import BounceLoader from "react-spinners/BounceLoader";
import "react-tooltip/dist/react-tooltip.css";
import { Tooltip } from "react-tooltip";
import { DebounceInput } from "react-debounce-input";
import useStorage from "squirrel-gill";
import { ErrorBoundary } from "react-error-boundary";

import "@picocss/pico";
import "./App.css";
import fs, { rosterFs } from "./fs";
import { readFiles } from "./repo";
import SelectSystem from "./repo/SelectSystem";
import Roster from "./Roster";
import { saveRoster, downloadRoster } from "./repo/rosters";
import {
  GameContext,
  RosterContext,
  SetRosterContext,
  OpenCategoriesContext,
  SetOpenCategoriesContext,
  useConfirm,
  useRoster,
  useUpdateRoster,
  useSystem,
} from "./Context";
import SelectionModal from "./Force/SelectionModal";
import ViewRoster from "./ViewRoster";
import { refreshRoster } from "./utils";
import EditSystem from "./repo/EditSystem";
import PropTypes from "prop-types";

const Body = ({ children, setSystemInfo }) => {
  const [roster, setRoster] = useRoster();
  const updateRoster = useUpdateRoster();
  const confirmLeaveRoster = useConfirm(
    roster?.__.updated,
    `${roster?.__.filename} has not been saved. Are you sure you want to close it?`
  );
  const system = useSystem();

  const [open, setOpen] = useState(false);

  return (
    <div className="container">
      <header>
        <nav>
          <ul>
            <li>
              <strong>BlueScribe</strong>
            </li>
            {roster && (
              <li>
                <DebounceInput
                  minLength={2}
                  debounceTimeout={300}
                  value={roster.name}
                  onChange={(e) => updateRoster("name", e.target.value)}
                />
              </li>
            )}
          </ul>
          {system && (
            <ul>
              {roster && (
                <li>
                  <button className="outline" onClick={() => setOpen(!open)}>
                    View
                  </button>
                </li>
              )}
              {roster && (
                <li>
                  <button
                    className="outline"
                    onClick={() => downloadRoster(roster)}
                  >
                    Download
                  </button>
                </li>
              )}
              {roster && (
                <li>
                  <button
                    className="outline"
                    disabled={!roster.__.updated}
                    onClick={async () => {
                      await saveRoster(roster, rosterFs);
                      setRoster(roster, false);
                    }}
                  >
                    Save
                  </button>
                </li>
              )}
              <li>
                <details role="list" dir="rtl">
                  <summary aria-haspopup="listbox" role="link">
                    ≡
                  </summary>
                  <ul role="listbox">
                    {roster && (
                      <li
                        data-tooltip-id="tooltip"
                        data-tooltip-html="This can be useful if the game system has been updated or if the roster was generated by a different tool and something seems incorrect."
                      >
                        <span
                          role="link"
                          onClick={() => {
                            document
                              .querySelectorAll("details")
                              .forEach((d) => d.removeAttribute("open"));
                            setRoster(refreshRoster(roster, system));
                          }}
                        >
                          Refresh Roster
                        </span>
                      </li>
                    )}
                    {roster && (
                      <li
                        data-tooltip-id="tooltip"
                        data-tooltip-html="Load a different roster"
                      >
                        <span
                          role="link"
                          onClick={() =>
                            confirmLeaveRoster(() => {
                              document
                                .querySelectorAll("details")
                                .forEach((d) => d.removeAttribute("open"));
                              setRoster();
                            })
                          }
                        >
                          {roster.__.filename}
                        </span>
                      </li>
                    )}
                    <li
                      data-tooltip-id="tooltip"
                      data-tooltip-html="Change game system"
                    >
                      <span
                        role="link"
                        onClick={() =>
                          confirmLeaveRoster(() => {
                            document
                              .querySelectorAll("details")
                              .forEach((d) => d.removeAttribute("open"));
                            setRoster();
                            setSystemInfo({});
                          })
                        }
                      >
                        {system?.gameSystem.name}
                      </span>
                    </li>
                  </ul>
                </details>
              </li>
            </ul>
          )}
        </nav>
      </header>
      {children}
      <SelectionModal open={open} setOpen={setOpen}>
        {roster && open && <ViewRoster />}
      </SelectionModal>
    </div>
  );
};
Body.propTypes = {
  children: PropTypes.node, 
  setSystemInfo: PropTypes.func
}

function App() {
  const [loading, setLoading] = useState(false);
  const [gameData, setGameData] = useState(null);

  const [systemInfo, setInfo] = useState(
    JSON.parse(localStorage.system || "{}")
  );

  const setSystemInfo = (info) => {
    localStorage.system = JSON.stringify(info);
    setInfo(info);
  };
  const [mode, setMode] = useStorage(localStorage, "dataMode", "editRoster");

  const [roster, setRoster] = useState(null);
  const [openCategories, setOpenCategories] = useState({});

  useEffect(() => {
    const load = async () => {
      if (mode === "editRoster") {
        setLoading(true);
        try {
          console.log(systemInfo.name);
          setGameData(await readFiles("/" + systemInfo.name, fs));
        } catch (e) {
          console.log(e);
          setInfo({});
        }
        setLoading(false);
      }
    };

    if (systemInfo.name) {
      load();
    }
  }, [systemInfo, mode]);

  window.gameData = gameData;

  if (loading) {
    return (
      <Body systemInfo={systemInfo} setSystemInfo={setSystemInfo}>
        <BounceLoader color="#36d7b7" className="loading" />
      </Body>
    );
  }

  if (!systemInfo?.name) {
    return (
      <Body systemInfo={systemInfo} setSystemInfo={setSystemInfo}>
        <SelectSystem setSystemInfo={setSystemInfo} setMode={setMode} />
      </Body>
    );
  }

  if (mode === "editSystem") {
    return <EditSystem systemInfo={systemInfo} setSystemInfo={setSystemInfo} />;
  }

  return (
    <GameContext.Provider value={gameData}>
      <RosterContext.Provider value={roster}>
        <SetRosterContext.Provider value={setRoster}>
          <OpenCategoriesContext.Provider value={openCategories}>
            <SetOpenCategoriesContext.Provider value={setOpenCategories}>
              <Body systemInfo={systemInfo} setSystemInfo={setSystemInfo}>
                <ErrorBoundary
                  fallbackRender={({ error, resetErrorBoundary }) => {
                    return (
                      <SelectSystem
                        setSystemInfo={(i) => {
                          resetErrorBoundary();
                          setSystemInfo(i);
                        }}
                        setMode={setMode}
                        previouslySelected={systemInfo}
                        error={error}
                      />
                    );
                  }}
                >
                  <Tooltip id="tooltip" />
                  <Roster />
                </ErrorBoundary>
              </Body>
            </SetOpenCategoriesContext.Provider>
          </OpenCategoriesContext.Provider>
        </SetRosterContext.Provider>
      </RosterContext.Provider>
    </GameContext.Provider>
  );
}

export default App;
