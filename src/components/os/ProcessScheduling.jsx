import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPlay, 
  FaPause, 
  FaStop, 
  FaPlus, 
  FaTrash, 
  FaClock,
  FaCogs,
  FaChartLine,
  FaInfoCircle
} from 'react-icons/fa';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement
);

const ProcessScheduling = () => {
  const [scheduler, setScheduler] = useState({
    algorithm: 'fcfs', // fcfs, sjf, priority, round-robin
    timeQuantum: 2,
    isRunning: false,
    currentProcess: null,
    readyQueue: [],
    completedProcesses: [],
    currentTime: 0
  });

  const [processes, setProcesses] = useState([]);
  const [newProcess, setNewProcess] = useState({
    name: '',
    arrivalTime: 0,
    burstTime: 0,
    priority: 1
  });
  const [showAddProcess, setShowAddProcess] = useState(false);
  const [ganttChart, setGanttChart] = useState([]);

  // Scheduling algorithms
  const scheduleProcesses = (processList, algorithm, timeQuantum = 2) => {
    let readyQueue = [...processList].sort((a, b) => a.arrivalTime - b.arrivalTime);
    let completed = [];
    let currentTime = 0;
    let gantt = [];
    let currentProcess = null;

    while (readyQueue.length > 0) {
      // Add arrived processes to ready queue
      const arrivedProcesses = readyQueue.filter(p => p.arrivalTime <= currentTime);
      
      if (arrivedProcesses.length === 0) {
        currentTime++;
        continue;
      }

      // Select process based on algorithm
      let selectedProcess;
      switch (algorithm) {
        case 'fcfs': // First Come First Served
          selectedProcess = arrivedProcesses[0];
          break;
        case 'sjf': // Shortest Job First
          selectedProcess = arrivedProcesses.reduce((min, p) => 
            p.burstTime < min.burstTime ? p : min
          );
          break;
        case 'priority':
          selectedProcess = arrivedProcesses.reduce((max, p) => 
            p.priority > max.priority ? p : max
          );
          break;
        case 'round-robin':
          selectedProcess = arrivedProcesses[0];
          break;
      }

      // Execute process
      const executionTime = algorithm === 'round-robin' 
        ? Math.min(selectedProcess.remainingTime, timeQuantum)
        : selectedProcess.remainingTime;

      gantt.push({
        process: selectedProcess.name,
        start: currentTime,
        end: currentTime + executionTime,
        duration: executionTime
      });

      currentTime += executionTime;
      selectedProcess.remainingTime -= executionTime;

      if (selectedProcess.remainingTime <= 0) {
        selectedProcess.completionTime = currentTime;
        selectedProcess.turnaroundTime = currentTime - selectedProcess.arrivalTime;
        selectedProcess.waitingTime = selectedProcess.turnaroundTime - selectedProcess.burstTime;
        completed.push(selectedProcess);
        readyQueue = readyQueue.filter(p => p.id !== selectedProcess.id);
      } else {
        // For round-robin, move to end of queue
        if (algorithm === 'round-robin') {
          readyQueue = readyQueue.filter(p => p.id !== selectedProcess.id);
          readyQueue.push(selectedProcess);
        }
      }
    }

    return { completed, gantt, totalTime: currentTime };
  };

  const addProcess = () => {
    if (newProcess.name && newProcess.burstTime > 0) {
      const process = {
        id: Date.now(),
        name: newProcess.name,
        arrivalTime: newProcess.arrivalTime,
        burstTime: newProcess.burstTime,
        remainingTime: newProcess.burstTime,
        priority: newProcess.priority,
        status: 'waiting'
      };

      setProcesses(prev => [...prev, process]);
      setNewProcess({ name: '', arrivalTime: 0, burstTime: 0, priority: 1 });
      setShowAddProcess(false);
    }
  };

  const runScheduling = () => {
    if (processes.length === 0) return;

    const result = scheduleProcesses(processes, scheduler.algorithm, scheduler.timeQuantum);
    setScheduler(prev => ({
      ...prev,
      completedProcesses: result.completed,
      currentTime: result.totalTime
    }));
    setGanttChart(result.gantt);
  };

  const resetScheduler = () => {
    setScheduler(prev => ({
      ...prev,
      currentProcess: null,
      completedProcesses: [],
      currentTime: 0
    }));
    setGanttChart([]);
  };

  const removeProcess = (processId) => {
    setProcesses(prev => prev.filter(p => p.id !== processId));
  };

  const calculateAverages = () => {
    if (scheduler.completedProcesses.length === 0) {
      return { avgWaitingTime: 0, avgTurnaroundTime: 0, avgResponseTime: 0 };
    }

    const totalWaitingTime = scheduler.completedProcesses.reduce((sum, p) => sum + p.waitingTime, 0);
    const totalTurnaroundTime = scheduler.completedProcesses.reduce((sum, p) => sum + p.turnaroundTime, 0);
    const totalResponseTime = scheduler.completedProcesses.reduce((sum, p) => sum + (p.turnaroundTime - p.burstTime), 0);

    return {
      avgWaitingTime: totalWaitingTime / scheduler.completedProcesses.length,
      avgTurnaroundTime: totalTurnaroundTime / scheduler.completedProcesses.length,
      avgResponseTime: totalResponseTime / scheduler.completedProcesses.length
    };
  };

  const averages = calculateAverages();

  const performanceChartData = {
    labels: scheduler.completedProcesses.map(p => p.name),
    datasets: [
      {
        label: 'Waiting Time',
        data: scheduler.completedProcesses.map(p => p.waitingTime),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      },
      {
        label: 'Turnaround Time',
        data: scheduler.completedProcesses.map(p => p.turnaroundTime),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };

  const renderGanttChart = () => {
    if (ganttChart.length === 0) return null;

    const maxTime = Math.max(...ganttChart.map(g => g.end));
    const colors = ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40'];

    return (
      <div className="gantt-chart">
        <div className="d-flex align-items-center mb-3">
          <h6 className="mb-0 me-3">Gantt Chart</h6>
          <div className="flex-grow-1">
            <div className="d-flex align-items-center">
              {ganttChart.map((block, index) => (
                <div
                  key={index}
                  className="d-flex align-items-center"
                  style={{ width: `${(block.duration / maxTime) * 100}%` }}
                >
                  <div
                    className="text-center p-2 text-white fw-bold border"
                    style={{
                      backgroundColor: colors[index % colors.length],
                      width: '100%',
                      minWidth: '60px'
                    }}
                  >
                    {block.process}
                    <div className="small">{block.duration}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="timeline">
          <div className="d-flex justify-content-between">
            {Array.from({ length: Math.ceil(maxTime / 5) + 1 }, (_, i) => (
              <div key={i} className="text-center small">
                <div>{i * 5}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="process-scheduling">
      <div className="row">
        {/* Controls */}
        <div className="col-12 mb-4">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FaCogs className="me-2" />
                Process Scheduling Simulation
              </h5>
              <div className="d-flex gap-2">
                <select
                  className="form-select"
                  value={scheduler.algorithm}
                  onChange={(e) => setScheduler(prev => ({ ...prev, algorithm: e.target.value }))}
                  style={{ width: 'auto' }}
                >
                  <option value="fcfs">First Come First Served (FCFS)</option>
                  <option value="sjf">Shortest Job First (SJF)</option>
                  <option value="priority">Priority Scheduling</option>
                  <option value="round-robin">Round Robin</option>
                </select>
                
                {scheduler.algorithm === 'round-robin' && (
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Time Quantum"
                    value={scheduler.timeQuantum}
                    onChange={(e) => setScheduler(prev => ({ ...prev, timeQuantum: parseInt(e.target.value) || 2 }))}
                    style={{ width: '120px' }}
                    min="1"
                  />
                )}
                
                <button
                  className="btn btn-success"
                  onClick={runScheduling}
                  disabled={processes.length === 0}
                >
                  <FaPlay className="me-1" />
                  Run
                </button>
                <button
                  className="btn btn-warning"
                  onClick={resetScheduler}
                >
                  <FaStop className="me-1" />
                  Reset
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddProcess(true)}
                >
                  <FaPlus />
                  Add Process
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <div className="text-center">
                    <h6 className="text-muted">Total Processes</h6>
                    <h4 className="text-primary">{processes.length}</h4>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <h6 className="text-muted">Completed</h6>
                    <h4 className="text-success">{scheduler.completedProcesses.length}</h4>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <h6 className="text-muted">Avg Waiting Time</h6>
                    <h4 className="text-warning">{averages.avgWaitingTime.toFixed(2)}</h4>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <h6 className="text-muted">Avg Turnaround Time</h6>
                    <h4 className="text-info">{averages.avgTurnaroundTime.toFixed(2)}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Process List */}
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Process Queue</h6>
            </div>
            <div className="card-body">
              <div className="process-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <AnimatePresence>
                  {processes.map((process) => (
                    <motion.div
                      key={process.id}
                      className="d-flex justify-content-between align-items-center p-3 border rounded mb-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div>
                        <div className="fw-bold">{process.name}</div>
                        <div className="small text-muted">
                          Arrival: {process.arrivalTime} | 
                          Burst: {process.burstTime} | 
                          Priority: {process.priority}
                        </div>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeProcess(process.id)}
                      >
                        <FaTrash />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {processes.length === 0 && (
                  <div className="text-center text-muted py-4">
                    <FaInfoCircle className="mb-2" size={32} />
                    <div>No processes added</div>
                    <small>Add processes to start scheduling</small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Scheduling Results</h6>
            </div>
            <div className="card-body">
              {scheduler.completedProcesses.length > 0 ? (
                <div className="results-table">
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Process</th>
                          <th>Waiting</th>
                          <th>Turnaround</th>
                          <th>Response</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scheduler.completedProcesses.map((process) => (
                          <tr key={process.id}>
                            <td>{process.name}</td>
                            <td>{process.waitingTime}</td>
                            <td>{process.turnaroundTime}</td>
                            <td>{process.turnaroundTime - process.burstTime}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <FaChartLine className="mb-2" size={32} />
                  <div>Run scheduling to see results</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Gantt Chart</h6>
            </div>
            <div className="card-body">
              {renderGanttChart()}
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        {scheduler.completedProcesses.length > 0 && (
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Performance Comparison</h6>
              </div>
              <div className="card-body">
                <Bar data={performanceChartData} options={{ responsive: true }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Process Modal */}
      {showAddProcess && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Process</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddProcess(false)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Process Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newProcess.name}
                    onChange={(e) => setNewProcess(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Arrival Time</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newProcess.arrivalTime}
                    onChange={(e) => setNewProcess(prev => ({ ...prev, arrivalTime: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Burst Time</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newProcess.burstTime}
                    onChange={(e) => setNewProcess(prev => ({ ...prev, burstTime: parseInt(e.target.value) || 0 }))}
                    min="1"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Priority</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newProcess.priority}
                    onChange={(e) => setNewProcess(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                    min="1"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddProcess(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={addProcess}
                  disabled={!newProcess.name || !newProcess.burstTime}
                >
                  Add Process
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessScheduling;
