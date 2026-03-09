const router = require('express').Router();
const ctrl   = require('../controllers/asignacionesController');

router.get('/',                      ctrl.getAll);
router.get('/equipos-disponibles',   ctrl.getEquiposDisponibles);
router.get('/:id',                   ctrl.getById);
router.post('/',                     ctrl.create);
router.put('/:id',                   ctrl.update);
router.post('/:id/devolucion',       ctrl.registrarDevolucion);

module.exports = router;
