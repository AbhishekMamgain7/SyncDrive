import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaMemory, 
  FaPlay, 
  FaPause, 
  FaStop, 
  FaPlus, 
  FaTrash,
  FaInfoCircle,
  FaChartBar
} from 'react-icons/fa';
import { Bar, Line } from 'react-chartjs-2';
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

const MemoryManagement = () => {
  const [memory, setMemory] = useState({
    total: 1024, // MB
    used: 0,
    free: 1024,
    processes: [],
    fragmentation: 0
  });

  const [processes, setProcesses] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [allocationStrategy, setAllocationStrategy] = useState('first-fit'); // first-fit, best-fit, worst-fit
  const [memoryHistory, setMemoryHistory] = useState([]);
  const [showAddProcess, setShowAddProcess] = useState(false);
  const [newProcess, setNewProcess] = useState({ name: '', size: 0, duration: 5 });

  // Memory allocation strategies
  const allocateMemory = (process, strategy) => {
    const blocks = memory.processes.sort((a, b) => a.start - b.start);
    let blockStart = 0;
    let selectedBlock = null;

    // Find free blocks
    const freeBlocks = [];
    for (let i = 0; i <= blocks.length; i++) {
      const prevEnd = i === 0 ? 0 : blocks[i - 1].start + blocks[i - 1].size;
      const nextStart = i === blocks.length ? memory.total : blocks[i].start;
      
      if (nextStart - prevEnd >= process.size) {
        freeBlocks.push({
          start: prevEnd,
          size: nextStart - prevEnd
        });
      }
    }

    // Apply allocation strategy
    switch (strategy) {
      case 'first-fit':
        selectedBlock = freeBlocks.find(block => block.size >= process.size);
        break;
      case 'best-fit':
        selectedBlock = freeBlocks
          .filter(block => block.size >= process.size)
          .sort((a, b) => a.size - b.size)[0];
        break;
      case 'worst-fit':
        selectedBlock = freeBlocks
          .filter(block => block.size >= process.size)
          .sort((a, b) => b.size - a.size)[0];
        break;
    }

    return selectedBlock;
  };

  const addProcess = () => {
    if (newProcess.name && newProcess.size > 0) {
      const block = allocateMemory(newProcess, allocationStrategy);
      
      if (block) {
        const process = {
          id: Date.now(),
          name: newProcess.name,
          size: newProcess.size,
          start: block.start,
          duration: newProcess.duration,
          startTime: Date.now(),
          status: 'running'
        };

        setMemory(prev => ({
          ...prev,
          processes: [...prev.processes, process],
          used: prev.used + process.size,
          free: prev.free - process.size
        }));

        setNewProcess({ name: '', size: 0, duration: 5 });
        setShowAddProcess(false);
      }
    }
  };

  const removeProcess = (processId) => {
    setMemory(prev => {
      const process = prev.processes.find(p => p.id === processId);
      if (process) {
        return {
          ...prev,
          processes: prev.processes.filter(p => p.id !== processId),
          used: prev.used - process.size,
          free: prev.free + process.size
        };
      }
      return prev;
    });
  };

  const calculateFragmentation = () => {
    const blocks = memory.processes.sort((a, b) => a.start - b.start);
    let totalFragmentation = 0;

    for (let i = 0; i <= blocks.length; i++) {
      const prevEnd = i === 0 ? 0 : blocks[i - 1].start + blocks[i - 1].size;
      const nextStart = i === blocks.length ? memory.total : blocks[i].start;
      const freeSpace = nextStart - prevEnd;
      
      if (freeSpace > 0) {
        totalFragmentation += freeSpace;
      }
    }

    return totalFragmentation;
  };

  // Auto-remove expired processes
  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        setMemory(prev => {
          const now = Date.now();
          const updatedProcesses = prev.processes.filter(process => {
            const elapsed = (now - process.startTime) / 1000;
            return elapsed < process.duration;
          });

          const removedProcesses = prev.processes.filter(process => {
            const elapsed = (now - process.startTime) / 1000;
            return elapsed >= process.duration;
          });

          const freedMemory = removedProcesses.reduce((sum, process) => sum + process.size, 0);

          return {
            ...prev,
            processes: updatedProcesses,
            used: prev.used - freedMemory,
            free: prev.free + freedMemory
          };
        });

        // Update memory history
        setMemoryHistory(prev => {
          const newEntry = {
            time: new Date().toLocaleTimeString(),
            used: memory.used,
            free: memory.free,
            fragmentation: calculateFragmentation()
          };
          return [...prev.slice(-10), newEntry]; // Keep last 10 entries
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isRunning, memory.used, memory.free]);

  const memoryChartData = {
    labels: ['Used Memory', 'Free Memory'],
    datasets: [
      {
        label: 'Memory (MB)',
        data: [memory.used, memory.free],
        backgroundColor: ['#ff6384', '#36a2eb'],
        borderColor: ['#ff6384', '#36a2eb'],
        borderWidth: 1
      }
    ]
  };

  const fragmentationChartData = {
    labels: memoryHistory.map(entry => entry.time),
    datasets: [
      {
        label: 'Memory Fragmentation (MB)',
        data: memoryHistory.map(entry => entry.fragmentation),
        borderColor: '#ff9f40',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        tension: 0.4
      }
    ]
  };

  const renderMemoryBlocks = () => {
    const blocks = memory.processes.sort((a, b) => a.start - b.start);
    const memoryBlocks = [];
    
    let currentPos = 0;
    
    for (let i = 0; i <= blocks.length; i++) {
      const prevEnd = i === 0 ? 0 : blocks[i - 1].start + blocks[i - 1].size;
      const nextStart = i === blocks.length ? memory.total : blocks[i].start;
      
      // Add free space before process
      if (prevEnd > currentPos) {
        memoryBlocks.push({
          type: 'free',
          start: currentPos,
          size: prevEnd - currentPos,
          color: '#e9ecef'
        });
      }
      
      // Add process block
      if (i < blocks.length) {
        memoryBlocks.push({
          type: 'process',
          start: blocks[i].start,
          size: blocks[i].size,
          process: blocks[i],
          color: `hsl(${(blocks[i].id * 137.5) % 360}, 70%, 60%)`
        });
        currentPos = blocks[i].start + blocks[i].size;
      }
    }
    
    // Add remaining free space
    if (currentPos < memory.total) {
      memoryBlocks.push({
        type: 'free',
        start: currentPos,
        size: memory.total - currentPos,
        color: '#e9ecef'
      });
    }

    return memoryBlocks;
  };

  return (
    <div className="memory-management">
      <div className="row">
        {/* Controls */}
        <div className="col-12 mb-4">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FaMemory className="me-2" />
                Memory Management Simulation
              </h5>
              <div className="d-flex gap-2">
                <select
                  className="form-select"
                  value={allocationStrategy}
                  onChange={(e) => setAllocationStrategy(e.target.value)}
                  style={{ width: 'auto' }}
                >
                  <option value="first-fit">First Fit</option>
                  <option value="best-fit">Best Fit</option>
                  <option value="worst-fit">Worst Fit</option>
                </select>
                <button
                  className={`btn ${isRunning ? 'btn-warning' : 'btn-success'}`}
                  onClick={() => setIsRunning(!isRunning)}
                >
                  {isRunning ? <FaPause /> : <FaPlay />}
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
                    <h6 className="text-muted">Total Memory</h6>
                    <h4 className="text-primary">{memory.total} MB</h4>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <h6 className="text-muted">Used Memory</h6>
                    <h4 className="text-danger">{memory.used} MB</h4>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <h6 className="text-muted">Free Memory</h6>
                    <h4 className="text-success">{memory.free} MB</h4>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-center">
                    <h6 className="text-muted">Fragmentation</h6>
                    <h4 className="text-warning">{calculateFragmentation()} MB</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Memory Visualization */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Memory Layout</h6>
            </div>
            <div className="card-body">
              <div className="memory-visualization" style={{ height: '300px' }}>
                <div className="d-flex flex-column h-100">
                  <div className="flex-grow-1 d-flex align-items-center">
                    <div className="w-100">
                      {renderMemoryBlocks().map((block, index) => (
                        <motion.div
                          key={index}
                          className="memory-block d-inline-block position-relative"
                          style={{
                            width: `${(block.size / memory.total) * 100}%`,
                            height: '40px',
                            backgroundColor: block.color,
                            border: '1px solid #dee2e6'
                          }}
                          initial={{ opacity: 0, scaleX: 0 }}
                          animate={{ opacity: 1, scaleX: 1 }}
                          transition={{ duration: 0.5 }}
                          title={`${block.type === 'process' ? block.process.name : 'Free'}: ${block.size} MB`}
                        >
                          {block.type === 'process' && (
                            <div className="position-absolute top-50 start-50 translate-middle text-white small fw-bold">
                              {block.process.name}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2">
                    <small className="text-muted">
                      0 MB ———————————————————————————————— {memory.total} MB
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Processes */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Active Processes</h6>
            </div>
            <div className="card-body">
              <div className="process-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <AnimatePresence>
                  {memory.processes.map((process) => (
                    <motion.div
                      key={process.id}
                      className="d-flex justify-content-between align-items-center p-2 border rounded mb-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div>
                        <div className="fw-bold">{process.name}</div>
                        <small className="text-muted">{process.size} MB</small>
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
                
                {memory.processes.length === 0 && (
                  <div className="text-center text-muted py-3">
                    <FaInfoCircle className="mb-2" />
                    <div>No active processes</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Memory Usage</h6>
            </div>
            <div className="card-body">
              <Bar data={memoryChartData} options={{ responsive: true }} />
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Fragmentation Over Time</h6>
            </div>
            <div className="card-body">
              <Line data={fragmentationChartData} options={{ responsive: true }} />
            </div>
          </div>
        </div>
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
                  <label className="form-label">Memory Size (MB)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newProcess.size}
                    onChange={(e) => setNewProcess(prev => ({ ...prev, size: parseInt(e.target.value) || 0 }))}
                    min="1"
                    max={memory.free}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Duration (seconds)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newProcess.duration}
                    onChange={(e) => setNewProcess(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
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
                  disabled={!newProcess.name || !newProcess.size || newProcess.size > memory.free}
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

export default MemoryManagement;
