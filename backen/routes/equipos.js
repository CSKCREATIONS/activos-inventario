const router = require('express').Router();
const ctrl   = require('../controllers/equiposController');
const hvCtrl = require('../controllers/hojaVidaController');

router.get('/',              ctrl.getAll);
router.get('/:id',           ctrl.getById);
router.get('/:id/historial', ctrl.getHistorial);
router.get('/:id/hoja-vida-pdf', hvCtrl.generarHojaVida);
router.post('/',             ctrl.create);
router.put('/:id',           ctrl.update);
router.delete('/:id',        ctrl.remove);

module.exports = router;
