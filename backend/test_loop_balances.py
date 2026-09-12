import unittest
from backend.solar_ld_engine import (SystemConfig, absorber_block, regenerator_block,
    controlled_regeneration, humidity_ratio_from_trh, moist_air_enthalpy,
    solution_enthalpy, solution_heating_kw)


class LoopBalanceTests(unittest.TestCase):
    def test_contactor_mass_and_energy(self):
        for fn, air, sol, temp, sign, key in [(absorber_block,.6,1.2,25,1,'m_water_absorb'),(regenerator_block,.36,.396,59.4,-1,'m_water_desorb')]:
            w=humidity_ratio_from_trh(32,78); h=moist_air_enthalpy(32,w)
            args=[32,78,w,h,101.325,air,sol,temp,.38]
            if sign<0: args.append(float('nan'))
            r=fn(*args,.7)
            self.assertAlmostEqual(sol+sign*r[key],r['m_sol_out'])
            self.assertAlmostEqual(sol*.38,r['m_sol_out']*r['xi_out'])
            residual=air*h+sol*solution_enthalpy(.38,temp)-air*moist_air_enthalpy(r['T_air_out'],r['w_air_out'])-r['m_sol_out']*r['h_sol_out']
            self.assertAlmostEqual(residual,0,places=9)

    def test_hx_uses_tank_enthalpy(self):
        self.assertAlmostEqual(solution_heating_kw(2,.38,30,59.4),2*(solution_enthalpy(.38,59.4)-solution_enthalpy(.38,30)))

    def test_independent_regenerator_flows_respect_domain(self):
        c=SystemConfig(reg_temp_auto_control=True)
        w=humidity_ratio_from_trh(32,78);h=moist_air_enthalpy(32,w)
        states=[]
        for need in [.001,.01,1]:
            r,t,d,capacity,_=controlled_regeneration(c,32,78,w,h,.72,.792,2,.38,need)
            self.assertTrue(.48<=r['controlled_air_kg_s']<=.8)
            self.assertTrue(.52<=r['controlled_solution_kg_s']<=.96)
            self.assertTrue(48.5<=t<=59.4)
            self.assertAlmostEqual(r['m_water_desorb']*d,min(need,r['m_water_desorb']))
            states.append((r['controlled_air_kg_s'],r['controlled_solution_kg_s'],t))
        self.assertNotEqual(states[0],states[-1])
