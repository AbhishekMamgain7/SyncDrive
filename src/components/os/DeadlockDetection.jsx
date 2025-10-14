import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaExclamationTriangle, 
  FaCheck, 
  FaTimes, 
  FaPlay, 
  FaPause, 
  FaStop,
  FaPlus,
  FaTrash,
  FaLock,
  FaUnlock,
  FaArrowRight,
  FaInfoCircle
} from 'react-icons/fa';

const DeadlockDetection = () => {
  const [system, setSystem] = useState({
    processes: [],
    resources: [],
    allocations: [],
    requests: [],
    isRunning: false,
    deadlockDetected: false,
    deadlockProcesses: [],
    deadlockResources: []
  });

  const [newProcess, setNewProcess] = useState({ name: '', pid: 0 });
  const [newResource, setNewResource] = useState({ name: '', rid: 0, total: 0, available: 0 });
  const [showAddProcess, setShowAddProcess] = useState(false);
  const [showAddResource, setShowAddResource] = useState(false);

  // Deadlock detection algorithm (Banker's Algorithm + Cycle Detection)
  const detectDeadlock = () => {
    const { processes, resources, allocations, requests } = system;
    
    // Initialize work vector (available resources)
    let work = resources.map(r => r.available);
    
    // Initialize finish vector
    let finish = processes.map(p => {
      const allocated = allocations.filter(a => a.processId === p.pid);
      const totalAllocated = allocated.reduce((sum, a) => sum + a.amount, 0);
      return totalAllocated === 0; // Process is finished if no resources allocated
    });

    // Safety algorithm
    const safeSequence = [];
    let changed = true;
    
    while (changed) {
      changed = false;
      
      for (let i = 0; i < processes.length; i++) {
        if (!finish[i]) {
          const process = processes[i];
          const processRequests = requests.filter(r => r.processId === process.pid);
          let canAllocate = true;
          
          // Check if process can be allocated resources
          for (let j = 0; j < processRequests.length; j++) {
            const request = processRequests[j];
            if (request.amount > work[request.resourceId]) {
              canAllocate = false;
              break;
            }
          }
          
          if (canAllocate) {
            // Process can finish, release its resources
            const processAllocations = allocations.filter(a => a.processId === process.pid);
            processAllocations.forEach(allocation => {
              work[allocation.resourceId] += allocation.amount;
            });
            
            finish[i] = true;
            safeSequence.push(process);
            changed = true;
          }
        }
      }
    }

    // Check for deadlock
    const deadlockProcesses = processes.filter((_, index) => !finish[index]);
    const isDeadlock = deadlockProcesses.length > 0;

    return {
      isDeadlock,
      deadlockProcesses,
      safeSequence,
      work
    };
  };

  const addProcess = () => {
    if (newProcess.name && newProcess.pid >= 0) {
      const process = {
        id: Date.now(),
        name: newProcess.name,
        pid: newProcess.pid,
        status: 'running'
      };

      setSystem(prev => ({
        ...prev,
        processes: [...prev.processes, process]
      }));

      setNewProcess({ name: '', pid: 0 });
      setShowAddProcess(false);
    }
  };

  const addResource = () => {
    if (newResource.name && newResource.rid >= 0 && newResource.total > 0) {
      const resource = {
        id: Date.now(),
        name: newResource.name,
        rid: newResource.rid,
        total: newResource.total,
        available: newResource.available || newResource.total
      };

      setSystem(prev => ({
        ...prev,
        resources: [...prev.resources, resource]
      }));

      setNewResource({ name: '', rid: 0, total: 0, available: 0 });
      setShowAddResource(false);
    }
  };

  const addAllocation = (processId, resourceId, amount) => {
    const allocation = {
      id: Date.now(),
      processId,
      resourceId,
      amount,
      timestamp: new Date()
    };

    setSystem(prev => ({
      ...prev,
      allocations: [...prev.allocations, allocation],
      resources: prev.resources.map(r => 
        r.rid === resourceId 
          ? { ...r, available: r.available - amount }
          : r
      )
    }));
  };

  const addRequest = (processId, resourceId, amount) => {
    const request = {
      id: Date.now(),
      processId,
      resourceId,
      amount,
      timestamp: new Date()
    };

    setSystem(prev => ({
      ...prev,
      requests: [...prev.requests, request]
    }));
  };

  const runDeadlockDetection = () => {
    const result = detectDeadlock();
    
    setSystem(prev => ({
      ...prev,
      deadlockDetected: result.isDeadlock,
      deadlockProcesses: result.deadlockProcesses,
      isRunning: true
    }));

    // Auto-stop after 3 seconds
    setTimeout(() => {
      setSystem(prev => ({ ...prev, isRunning: false }));
    }, 3000);
  };

  const resetSystem = () => {
    setSystem({
      processes: [],
      resources: [],
      allocations: [],
      requests: [],
      isRunning: false,
      deadlockDetected: false,
      deadlockProcesses: [],
      deadlockResources: []
    });
  };

  const removeProcess = (processId) => {
    setSystem(prev => ({
      ...prev,
      processes: prev.processes.filter(p => p.pid !== processId),
      allocations: prev.allocations.filter(a => a.processId !== processId),
      requests: prev.requests.filter(r => r.processId !== processId)
    }));
  };

  const removeResource = (resourceId) => {
    setSystem(prev => ({
      ...prev,
      resources: prev.resources.filter(r => r.rid !== resourceId),
      allocations: prev.allocations.filter(a => a.resourceId !== resourceId),
      requests: prev.requests.filter(r => r.resourceId !== resourceId)
    }));
  };

  const renderResourceAllocationGraph = () => {
    const { processes, resources, allocations, requests } = system;
    
    return (
      <div className="resource-allocation-graph">
        <h6 className="mb-3">Resource Allocation Graph</h6>
        
        {/* Processes */}
        <div className="processes-section mb-4">
          <h6 className="small text-muted">PROCESSES</h6>
          <div className="d-flex flex-wrap gap-2">
            {processes.map((process) => (
              <motion.div
                key={process.id}
                className={`process-node p-2 border rounded ${
                  system.deadlockProcesses.some(p => p.pid === process.pid) 
                    ? 'bg-danger text-white' 
                    : 'bg-primary text-white'
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-center">
                  <FaLock className="mb-1" />
                  <div className="small fw-bold">{process.name}</div>
                  <div className="small">P{process.pid}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div className="resources-section mb-4">
          <h6 className="small text-muted">RESOURCES</h6>
          <div className="d-flex flex-wrap gap-2">
            {resources.map((resource) => (
              <motion.div
                key={resource.id}
                className="resource-node p-2 border rounded bg-success text-white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-center">
                  <FaUnlock className="mb-1" />
                  <div className="small fw-bold">{resource.name}</div>
                  <div className="small">R{resource.rid}</div>
                  <div className="small">{resource.available}/{resource.total}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Allocation and Request Edges */}
        <div className="edges-section">
          <h6 className="small text-muted">ALLOCATIONS & REQUESTS</h6>
          
          {/* Allocations (Process -> Resource) */}
          <div className="allocations mb-3">
            <h6 className="small">Allocations:</h6>
            <div className="row g-2">
              {allocations.map((allocation) => (
                <div key={allocation.id} className="col-md-6">
                  <motion.div
                    className="p-2 border rounded bg-light"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="d-flex align-items-center">
                      <span className="badge bg-primary me-2">P{allocation.processId}</span>
                      <FaArrowRight className="me-2" />
                      <span className="badge bg-success me-2">R{allocation.resourceId}</span>
                      <span className="text-muted">({allocation.amount})</span>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>

          {/* Requests (Process -> Resource) */}
          <div className="requests">
            <h6 className="small">Requests:</h6>
            <div className="row g-2">
              {requests.map((request) => (
                <div key={request.id} className="col-md-6">
                  <motion.div
                    className="p-2 border rounded bg-light"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="d-flex align-items-center">
                      <span className="badge bg-warning me-2">P{request.processId}</span>
                      <FaArrowRight className="me-2" />
                      <span className="badge bg-danger me-2">R{request.resourceId}</span>
                      <span className="text-muted">({request.amount})</span>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSystemStatus = () => {
    const result = detectDeadlock();
    
    return (
      <div className="system-status">
        <div className="row">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body text-center">
                <h5 className="card-title">System Status</h5>
                {result.isDeadlock ? (
                  <div className="text-danger">
                    <FaExclamationTriangle size={48} className="mb-2" />
                    <h4>DEADLOCK DETECTED!</h4>
                    <p>Deadlocked processes: {result.deadlockProcesses.length}</p>
                  </div>
                ) : (
                  <div className="text-success">
                    <FaCheck size={48} className="mb-2" />
                    <h4>SYSTEM SAFE</h4>
                    <p>No deadlock detected</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h6 className="card-title">System Statistics</h6>
                <ul className="list-unstyled">
                  <li><strong>Processes:</strong> {system.processes.length}</li>
                  <li><strong>Resources:</strong> {system.resources.length}</li>
                  <li><strong>Allocations:</strong> {system.allocations.length}</li>
                  <li><strong>Requests:</strong> {system.requests.length}</li>
                  <li><strong>Safe Sequence:</strong> {result.safeSequence.length > 0 ? result.safeSequence.map(p => p.name).join(' → ') : 'None'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="deadlock-detection">
      <div className="row">
        {/* Controls */}
        <div className="col-12 mb-4">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FaExclamationTriangle className="me-2" />
                Deadlock Detection Simulation
              </h5>
              <div className="d-flex gap-2">
                <button
                  className={`btn ${system.isRunning ? 'btn-warning' : 'btn-success'}`}
                  onClick={runDeadlockDetection}
                  disabled={system.processes.length === 0 || system.resources.length === 0}
                >
                  {system.isRunning ? <FaPause /> : <FaPlay />}
                  {system.isRunning ? 'Running...' : 'Detect Deadlock'}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={resetSystem}
                >
                  <FaStop />
                  Reset
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddProcess(true)}
                >
                  <FaPlus />
                  Add Process
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => setShowAddResource(true)}
                >
                  <FaPlus />
                  Add Resource
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="col-12 mb-4">
          {renderSystemStatus()}
        </div>

        {/* Resource Allocation Graph */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Resource Allocation Graph</h6>
            </div>
            <div className="card-body">
              {system.processes.length > 0 || system.resources.length > 0 ? (
                renderResourceAllocationGraph()
              ) : (
                <div className="text-center text-muted py-5">
                  <FaInfoCircle className="mb-2" size={48} />
                  <h5>No Processes or Resources</h5>
                  <p>Add processes and resources to start the simulation</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Process and Resource Management */}
        <div className="col-lg-4">
          <div className="card mb-3">
            <div className="card-header">
              <h6 className="mb-0">Processes</h6>
            </div>
            <div className="card-body">
              <div className="process-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {system.processes.map((process) => (
                  <motion.div
                    key={process.id}
                    className="d-flex justify-content-between align-items-center p-2 border rounded mb-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <div>
                      <div className="fw-bold">{process.name}</div>
                      <small className="text-muted">PID: {process.pid}</small>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => removeProcess(process.pid)}
                    >
                      <FaTrash />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Resources</h6>
            </div>
            <div className="card-body">
              <div className="resource-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {system.resources.map((resource) => (
                  <motion.div
                    key={resource.id}
                    className="d-flex justify-content-between align-items-center p-2 border rounded mb-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <div>
                      <div className="fw-bold">{resource.name}</div>
                      <small className="text-muted">
                        RID: {resource.rid} | Available: {resource.available}/{resource.total}
                      </small>
                    </div>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => removeResource(resource.rid)}
                    >
                      <FaTrash />
                    </button>
                  </motion.div>
                ))}
              </div>
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
                  <label className="form-label">Process ID</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newProcess.pid}
                    onChange={(e) => setNewProcess(prev => ({ ...prev, pid: parseInt(e.target.value) || 0 }))}
                    min="0"
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
                  disabled={!newProcess.name}
                >
                  Add Process
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Resource Modal */}
      {showAddResource && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Resource</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddResource(false)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Resource Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newResource.name}
                    onChange={(e) => setNewResource(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Resource ID</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newResource.rid}
                    onChange={(e) => setNewResource(prev => ({ ...prev, rid: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Total Instances</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newResource.total}
                    onChange={(e) => setNewResource(prev => ({ ...prev, total: parseInt(e.target.value) || 0 }))}
                    min="1"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Available Instances</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newResource.available}
                    onChange={(e) => setNewResource(prev => ({ ...prev, available: parseInt(e.target.value) || 0 }))}
                    min="0"
                    max={newResource.total}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddResource(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={addResource}
                  disabled={!newResource.name || !newResource.total}
                >
                  Add Resource
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeadlockDetection;
