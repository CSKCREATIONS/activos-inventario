const router = require('express').Router();
const ctrl   = require('../controllers/usuariosController');

router.get('/',             ctrl.getAll);
router.get('/areas',        ctrl.getAreas);
router.get('/:id',          ctrl.getById);
router.get('/:id/perfil',   ctrl.getPerfil);
router.post('/',            ctrl.create);
router.put('/:id',          ctrl.update);
router.delete('/:id',       ctrl.remove);

module.exports = router;
